-- Gift records. Money moves outside the app; only a receiver's confirmation counts.

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches (id) on delete set null,
  gifter_id uuid references public.profiles (id) on delete set null,
  receiver_id uuid references public.profiles (id) on delete set null,
  post_id uuid references public.posts (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  is_anonymous boolean not null default false,
  status public.gift_status not null default 'pending',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (gifter_id <> receiver_id)
);
create index gifts_gifter_id_idx on public.gifts (gifter_id);
create index gifts_receiver_id_idx on public.gifts (receiver_id);
create index gifts_post_id_idx on public.gifts (post_id);
-- One pending gift per match, so a double tap can't record a gift twice.
create unique index gifts_one_pending_per_match_idx on public.gifts (match_id) where status = 'pending';

alter table public.gifts enable row level security;

create policy gifts_select on public.gifts for select to authenticated
  using (gifter_id = auth.uid() or receiver_id = auth.uid());

-- Nobody is left to confirm a pending gift once either person's account is gone.
create function private.cancel_gifts_on_profile_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.gifts set status = 'cancelled'
    where status = 'pending' and (gifter_id = old.id or receiver_id = old.id);
  return old;
end $$;

create trigger profiles_cancel_gifts
  before delete on public.profiles
  for each row execute function private.cancel_gifts_on_profile_delete();

create function public.record_gift(p_match_id uuid, p_amount_cents integer, p_is_anonymous boolean default false)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  match public.matches;
  post public.posts;
  remaining integer;
  gift_id uuid;
begin
  perform private.rate_limit(uid, 'record_gift', 50, interval '1 day');
  select * into match from public.matches m where m.id = p_match_id;
  if not found or match.gifter_id <> uid then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  if match.status <> 'active' then
    raise exception 'match_not_active' using errcode = '42501';
  end if;

  select * into post from public.posts p where p.id = match.post_id;
  if post.status not in ('open', 'closed') then
    raise exception 'post_not_open' using errcode = '42501';
  end if;
  remaining := post.goal_cents - post.raised_cents;
  if remaining <= 0 or p_amount_cents > remaining or p_amount_cents < least(100, remaining) then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  insert into public.gifts (match_id, gifter_id, receiver_id, post_id, amount_cents, is_anonymous)
    values (match.id, uid, match.receiver_id, match.post_id, p_amount_cents, coalesce(p_is_anonymous, false))
    returning id into gift_id;
  perform private.notify(match.receiver_id, 'gift_recorded',
    jsonb_build_object('gift_id', gift_id, 'post_id', match.post_id, 'amount_cents', p_amount_cents));
  return gift_id;
exception
  when unique_violation then
    raise exception 'gift_already_pending' using errcode = '23505';
end $$;

create function public.cancel_gift(p_gift_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  gift public.gifts;
begin
  select * into gift from public.gifts g where g.id = p_gift_id for update;
  if not found or gift.gifter_id is distinct from uid then
    raise exception 'gift_not_found' using errcode = 'P0002';
  end if;
  if gift.status = 'cancelled' then
    return;
  end if;
  if gift.status <> 'pending' then
    raise exception 'gift_not_pending' using errcode = '42501';
  end if;
  update public.gifts set status = 'cancelled' where id = gift.id;
end $$;

-- Repeating the same response has no extra effect.
create function public.respond_to_gift(p_gift_id uuid, p_confirm boolean) returns public.gift_status
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  gift public.gifts;
  post public.posts;
begin
  select * into gift from public.gifts g where g.id = p_gift_id for update;
  if not found or gift.receiver_id is distinct from uid then
    raise exception 'gift_not_found' using errcode = 'P0002';
  end if;
  if (gift.status = 'confirmed' and p_confirm) or (gift.status = 'disputed' and not p_confirm) then
    return gift.status;
  end if;
  if gift.status <> 'pending' then
    raise exception 'gift_not_pending' using errcode = '42501';
  end if;

  if not p_confirm then
    update public.gifts set status = 'disputed' where id = gift.id;
    perform private.notify(gift.gifter_id, 'gift_disputed',
      jsonb_build_object('gift_id', gift.id, 'post_id', gift.post_id));
    return 'disputed';
  end if;

  update public.gifts set status = 'confirmed', confirmed_at = now() where id = gift.id;
  update public.posts set raised_cents = raised_cents + gift.amount_cents
    where id = gift.post_id
    returning * into post;
  if post.raised_cents >= post.goal_cents then
    perform private.close_post(post.id);
  end if;
  perform private.notify(gift.gifter_id, 'gift_confirmed',
    jsonb_build_object('gift_id', gift.id, 'post_id', gift.post_id));
  return 'confirmed';
end $$;

-- Gift records stay intact, so a post with any gift can be closed but not deleted.
-- Returns the storage paths so the client can delete the files.
create function public.delete_post(p_post_id uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  post public.posts := private.owned_post(private.require_user(), p_post_id);
  paths text[];
begin
  if exists (select 1 from public.gifts g where g.post_id = post.id) then
    raise exception 'post_has_gifts' using errcode = '42501';
  end if;
  paths := array(select ph.storage_path from public.post_photos ph where ph.post_id = post.id);
  delete from public.posts where id = post.id;
  return paths;
end $$;

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant select on public.gifts to authenticated;

grant execute on function
  public.record_gift(uuid, integer, boolean),
  public.cancel_gift(uuid),
  public.respond_to_gift(uuid, boolean),
  public.delete_post(uuid)
to authenticated;
