-- Friends, blocking, and the activity feed.

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high))
);
create index friendships_user_high_idx on public.friendships (user_high);

alter table public.friendships enable row level security;

create policy friendships_select on public.friendships for select to authenticated
  using (user_low = auth.uid() or user_high = auth.uid());

create function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.user_low = least(a, b) and f.user_high = greatest(a, b) and f.status = 'accepted'
  );
$$;

create function public.search_users(p_query text, p_cursor text default null, p_limit integer default 20)
returns table (id uuid, username text, display_name text, avatar_path text)
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := private.require_user();
  pattern text := '%' || private.like_escape(p_query) || '%';
begin
  return query
    select pr.id, pr.username, pr.display_name, pr.avatar_path
    from public.profiles pr
    where pr.id <> uid
      and (pr.username ilike pattern or pr.display_name ilike pattern)
      and (p_cursor is null or pr.username > p_cursor)
    order by pr.username
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- Requesting someone who already requested you accepts their request.
create function public.request_friend(p_user_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  friendship public.friendships;
begin
  perform private.rate_limit(uid, 'request_friend', 50, interval '1 day');
  if p_user_id = uid then
    raise exception 'cannot_friend_self' using errcode = '22023';
  end if;
  if private.is_blocked(uid, p_user_id)
     or not exists (select 1 from public.profiles pr where pr.id = p_user_id and pr.onboarded_at is not null) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  select * into friendship from public.friendships f
    where f.user_low = least(uid, p_user_id) and f.user_high = greatest(uid, p_user_id)
    for update;
  if found then
    if friendship.status = 'pending' and friendship.requested_by <> uid then
      update public.friendships set status = 'accepted' where id = friendship.id;
      perform private.notify(p_user_id, 'friend_accepted', jsonb_build_object('user_id', uid));
    end if;
    return friendship.id;
  end if;

  insert into public.friendships (user_low, user_high, requested_by)
    values (least(uid, p_user_id), greatest(uid, p_user_id), uid)
    on conflict (user_low, user_high) do update set user_low = excluded.user_low
    returning * into friendship;
  perform private.notify(p_user_id, 'friend_request',
    jsonb_build_object('friendship_id', friendship.id, 'user_id', uid));
  return friendship.id;
end $$;

-- Declining removes the row, so the person can ask again later.
create function public.respond_friend(p_friendship_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  friendship public.friendships;
begin
  select * into friendship from public.friendships f
    where f.id = p_friendship_id and uid in (f.user_low, f.user_high)
    for update;
  if not found then
    raise exception 'friendship_not_found' using errcode = 'P0002';
  end if;
  if friendship.requested_by = uid then
    raise exception 'cannot_respond_to_own_request' using errcode = '42501';
  end if;
  if friendship.status <> 'pending' then
    raise exception 'friendship_not_pending' using errcode = '42501';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted' where id = friendship.id;
    perform private.notify(friendship.requested_by, 'friend_accepted', jsonb_build_object('user_id', uid));
  else
    delete from public.friendships where id = friendship.id;
  end if;
end $$;

create function public.remove_friend(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  delete from public.friendships
    where user_low = least(uid, p_user_id) and user_high = greatest(uid, p_user_id);
end $$;

create function public.get_friends()
returns table (friendship_id uuid, user_id uuid, username text, display_name text, avatar_path text)
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  return query
    select f.id, pr.id, pr.username, pr.display_name, pr.avatar_path
    from public.friendships f
    join public.profiles pr on pr.id = case when f.user_low = uid then f.user_high else f.user_low end
    where f.status = 'accepted' and uid in (f.user_low, f.user_high)
    order by pr.username;
end $$;

-- Blocking ends everything open between the two people. Confirmed gifts stay on record.
create function public.block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if p_user_id = uid then
    raise exception 'cannot_block_self' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles pr where pr.id = p_user_id) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (uid, p_user_id)
    on conflict (blocker_id, blocked_id) do nothing;
  delete from public.friendships
    where user_low = least(uid, p_user_id) and user_high = greatest(uid, p_user_id);
  update public.match_requests r set status = 'cancelled'
    from public.posts p
    where p.id = r.post_id and r.status = 'pending'
      and ((r.gifter_id = uid and p.receiver_id = p_user_id) or (r.gifter_id = p_user_id and p.receiver_id = uid));
  update public.matches set status = 'closed'
    where status = 'active'
      and ((gifter_id = uid and receiver_id = p_user_id) or (gifter_id = p_user_id and receiver_id = uid));
  update public.gifts set status = 'cancelled'
    where status = 'pending'
      and ((gifter_id = uid and receiver_id = p_user_id) or (gifter_id = p_user_id and receiver_id = uid));
end $$;

create function public.unblock_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  delete from public.blocks where blocker_id = uid and blocked_id = p_user_id;
end $$;

-- Friends' confirmed gifts. Leaves out receivers, since a friend's giving
-- shouldn't reveal who needed help.
create function public.get_friend_activity(
  p_cursor_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns table (
  gift_id uuid,
  gifter_id uuid,
  username text,
  display_name text,
  avatar_path text,
  amount_cents integer,
  post_id uuid,
  confirmed_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  return query
    select g.id, g.gifter_id, pr.username, pr.display_name, pr.avatar_path, g.amount_cents, g.post_id, g.confirmed_at
    from public.gifts g
    join public.profiles pr on pr.id = g.gifter_id
    join public.privacy_settings s on s.user_id = g.gifter_id
    where g.status = 'confirmed'
      and not g.is_anonymous
      and s.share_activity
      and private.are_friends(uid, g.gifter_id)
      and (p_cursor_at is null or (g.confirmed_at, g.id) < (p_cursor_at, p_cursor_id))
    order by g.confirmed_at desc, g.id desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant select on public.friendships to authenticated;

grant execute on function
  public.search_users(text, text, integer),
  public.request_friend(uuid),
  public.respond_friend(uuid, boolean),
  public.remove_friend(uuid),
  public.get_friends(),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.get_friend_activity(timestamptz, uuid, integer)
to authenticated;
