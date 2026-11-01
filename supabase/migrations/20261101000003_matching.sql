-- Swipes, match requests, matches, and the swipe feed.

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  gifter_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  direction public.swipe_direction not null,
  created_at timestamptz not null default now(),
  unique (gifter_id, post_id)
);
create index swipes_post_id_idx on public.swipes (post_id);

create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  gifter_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (gifter_id, post_id)
);
create index match_requests_post_id_idx on public.match_requests (post_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.match_requests (id) on delete cascade,
  gifter_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  status public.match_status not null default 'active',
  created_at timestamptz not null default now()
);
create index matches_gifter_id_idx on public.matches (gifter_id);
create index matches_receiver_id_idx on public.matches (receiver_id);
create index matches_post_id_idx on public.matches (post_id);

alter table public.swipes enable row level security;
alter table public.match_requests enable row level security;
alter table public.matches enable row level security;

create policy swipes_select on public.swipes for select to authenticated
  using (gifter_id = auth.uid());
create policy match_requests_select on public.match_requests for select to authenticated
  using (
    gifter_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_id and p.receiver_id = auth.uid())
  );
create policy matches_select on public.matches for select to authenticated
  using (gifter_id = auth.uid() or receiver_id = auth.uid());

-- Matched gifters can still see a post after it closes, and only they get its instructions.
create policy posts_select_matched on public.posts for select to authenticated
  using (
    status <> 'removed'
    and exists (select 1 from public.matches m where m.post_id = posts.id and m.gifter_id = auth.uid())
  );
create policy gift_instructions_select on public.post_gift_instructions for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and p.receiver_id = auth.uid())
    or exists (
      select 1 from public.matches m
      where m.post_id = post_gift_instructions.post_id and m.gifter_id = auth.uid() and m.status = 'active'
    )
  );

-- Closing or removing a post cancels the requests still waiting on it.
create function private.cancel_pending_requests() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.match_requests set status = 'cancelled' where post_id = new.id and status = 'pending';
  return new;
end $$;

create trigger posts_cancel_requests
  after update of status on public.posts
  for each row
  when (old.status = 'open' and new.status in ('closed', 'removed'))
  execute function private.cancel_pending_requests();

-- A right swipe also creates a request. A later right swipe upgrades an earlier
-- left swipe, so offering from Discover works on a post passed in the card stack.
create function public.record_swipe(p_post_id uuid, p_direction public.swipe_direction) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  post public.posts;
  request_id uuid;
begin
  perform private.rate_limit(uid, 'record_swipe', 600, interval '1 hour');
  select * into post from public.posts p where p.id = p_post_id;
  if not found or private.is_blocked(uid, post.receiver_id) then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  if post.receiver_id = uid then
    raise exception 'cannot_swipe_own_post' using errcode = '42501';
  end if;
  if post.status <> 'open' then
    raise exception 'post_not_open' using errcode = '42501';
  end if;

  insert into public.swipes (gifter_id, post_id, direction)
    values (uid, p_post_id, p_direction)
    on conflict (gifter_id, post_id) do update set direction = 'right'
      where excluded.direction = 'right';

  if p_direction = 'left' then
    return null;
  end if;

  insert into public.match_requests (gifter_id, post_id)
    values (uid, p_post_id)
    on conflict (gifter_id, post_id) do nothing
    returning id into request_id;
  if request_id is not null then
    perform private.notify(post.receiver_id, 'match_request',
      jsonb_build_object('request_id', request_id, 'post_id', p_post_id));
    return request_id;
  end if;
  select r.id into request_id from public.match_requests r where r.gifter_id = uid and r.post_id = p_post_id;
  return request_id;
end $$;

-- Returns the match when accepted. Repeating the same response has no extra effect.
create function public.respond_to_request(p_request_id uuid, p_accept boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  request public.match_requests;
  post public.posts;
  match_id uuid;
begin
  select * into request from public.match_requests r where r.id = p_request_id for update;
  if found then
    select * into post from public.posts p where p.id = request.post_id;
  end if;
  if not found or post.receiver_id <> uid then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if request.status = 'accepted' and p_accept then
    select m.id into match_id from public.matches m where m.request_id = request.id;
    return match_id;
  end if;
  if request.status = 'declined' and not p_accept then
    return null;
  end if;
  if request.status <> 'pending' then
    raise exception 'request_not_pending' using errcode = '42501';
  end if;

  if not p_accept then
    update public.match_requests set status = 'declined' where id = request.id;
    return null;
  end if;

  if post.status <> 'open' then
    raise exception 'post_not_open' using errcode = '42501';
  end if;
  update public.match_requests set status = 'accepted' where id = request.id;
  insert into public.matches (request_id, gifter_id, receiver_id, post_id)
    values (request.id, request.gifter_id, uid, request.post_id)
    returning id into match_id;
  perform private.notify(request.gifter_id, 'match_created',
    jsonb_build_object('match_id', match_id, 'post_id', request.post_id));
  perform private.notify(uid, 'match_created',
    jsonb_build_object('match_id', match_id, 'post_id', request.post_id));
  return match_id;
end $$;

-- Runs as the caller, so RLS keeps out blocked users and closed posts.
create function public.get_swipe_feed(p_limit integer default 20)
returns table (
  id uuid,
  receiver_id uuid,
  receiver_first_name text,
  title text,
  story text,
  category text,
  goal_cents integer,
  raised_cents integer,
  general_location text,
  photo_paths text[],
  created_at timestamptz
)
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  return query
    select p.id, p.receiver_id, split_part(pr.display_name, ' ', 1), p.title, p.story, p.category,
           p.goal_cents, p.raised_cents, p.general_location,
           array(select ph.storage_path from public.post_photos ph where ph.post_id = p.id order by ph.position),
           p.created_at
    from public.posts p
    join public.profiles pr on pr.id = p.receiver_id
    where p.status = 'open'
      and p.receiver_id <> uid
      and not exists (select 1 from public.swipes s where s.post_id = p.id and s.gifter_id = uid)
    order by (p.raised_cents::numeric / p.goal_cents >= 0.8) desc, p.created_at desc, p.id
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant select on public.swipes, public.match_requests, public.matches to authenticated;

grant execute on function
  public.record_swipe(uuid, public.swipe_direction),
  public.respond_to_request(uuid, boolean),
  public.get_swipe_feed(integer)
to authenticated;
