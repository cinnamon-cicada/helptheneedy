-- Replaces two-way friendships with one-way follows.

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index follows_followed_id_idx on public.follows (followed_id);

alter table public.follows enable row level security;

create policy follows_select on public.follows for select to authenticated
  using (follower_id = auth.uid() or followed_id = auth.uid());

-- Friends become mutual follows. A pending request becomes a follow by the requester.
insert into public.follows (follower_id, followed_id, created_at)
  select f.requested_by,
         case when f.requested_by = f.user_low then f.user_high else f.user_low end,
         f.created_at
  from public.friendships f
  union all
  select case when f.requested_by = f.user_low then f.user_high else f.user_low end,
         f.requested_by,
         f.created_at
  from public.friendships f
  where f.status = 'accepted';

drop function public.request_friend(uuid);
drop function public.respond_friend(uuid, boolean);
drop function public.remove_friend(uuid);
drop function public.get_friends();

-- Following needs no approval, so anything private to friends requires a mutual
-- follow. Otherwise anyone could follow a stranger to see their gift activity.
create or replace function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.follows f where f.follower_id = a and f.followed_id = b)
     and exists (select 1 from public.follows f where f.follower_id = b and f.followed_id = a);
$$;

drop table public.friendships;
drop type public.friendship_status;

create function public.follow_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  perform private.rate_limit(uid, 'follow_user', 50, interval '1 day');
  if p_user_id = uid then
    raise exception 'cannot_follow_self' using errcode = '22023';
  end if;
  if private.is_blocked(uid, p_user_id)
     or not exists (select 1 from public.profiles pr where pr.id = p_user_id and pr.onboarded_at is not null) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  insert into public.follows (follower_id, followed_id) values (uid, p_user_id)
    on conflict (follower_id, followed_id) do nothing;
  if found then
    perform private.notify(p_user_id, 'new_follower', jsonb_build_object('user_id', uid));
  end if;
end $$;

create function public.unfollow_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  delete from public.follows where follower_id = uid and followed_id = p_user_id;
end $$;

create function public.remove_follower(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  delete from public.follows where follower_id = p_user_id and followed_id = uid;
end $$;

-- Everyone connected to you in either direction, for the friends page.
create function public.get_follows()
returns table (user_id uuid, username text, display_name text, avatar_path text, is_following boolean, follows_me boolean)
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  return query
    select pr.id, pr.username, pr.display_name, pr.avatar_path,
           bool_or(f.follower_id = uid), bool_or(f.followed_id = uid)
    from public.follows f
    join public.profiles pr on pr.id = case when f.follower_id = uid then f.followed_id else f.follower_id end
    where uid in (f.follower_id, f.followed_id)
    group by pr.id
    order by pr.username;
end $$;

-- Blocking ends everything open between the two people. Confirmed gifts stay on record.
create or replace function public.block_user(p_user_id uuid) returns void
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
  delete from public.follows
    where (follower_id = uid and followed_id = p_user_id) or (follower_id = p_user_id and followed_id = uid);
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

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant select on public.follows to authenticated;

grant execute on function
  public.follow_user(uuid),
  public.unfollow_user(uuid),
  public.remove_follower(uuid),
  public.get_follows()
to authenticated;
