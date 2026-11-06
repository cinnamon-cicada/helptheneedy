-- Demo mode: gifts to seeded demo receivers count right away.
--
-- Demo receivers are made-up accounts that can't accept requests or confirm
-- gifts, so demo_send_gift runs that whole flow for them in one transaction.
-- This is the one exception to "only a receiver's confirmation counts": it
-- applies only when profiles.is_demo is true, which no RPC can set. Gifts to
-- real users still go through record_swipe, respond_to_request, record_gift
-- and respond_to_gift. No money moves; the gifter's demo balance lives on
-- their device only.

alter table public.profiles add column is_demo boolean not null default false;

create function public.demo_send_gift(p_post_id uuid, p_amount_cents integer, p_is_anonymous boolean default false)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  post public.posts;
  remaining integer;
  v_request_id uuid;
  v_match_id uuid;
  v_gift_id uuid;
begin
  perform private.rate_limit(uid, 'demo_send_gift', 100, interval '1 day');

  select * into post from public.posts p where p.id = p_post_id for update;
  if not found or private.is_blocked(uid, post.receiver_id) then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  if post.receiver_id = uid then
    raise exception 'cannot_gift_own_post' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles pr where pr.id = post.receiver_id and pr.is_demo) then
    raise exception 'receiver_not_demo' using errcode = '42501';
  end if;
  if post.status <> 'open' then
    raise exception 'post_not_open' using errcode = '42501';
  end if;
  remaining := post.goal_cents - post.raised_cents;
  if p_amount_cents is null or p_amount_cents > remaining or p_amount_cents < least(100, remaining) then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  -- The right swipe, the accepted request and the match, as the normal flow would leave them.
  insert into public.swipes (gifter_id, post_id, direction)
    values (uid, post.id, 'right')
    on conflict (gifter_id, post_id) do update set direction = 'right';
  insert into public.match_requests (gifter_id, post_id, status)
    values (uid, post.id, 'accepted')
    on conflict (gifter_id, post_id) do update set status = 'accepted'
    returning id into v_request_id;
  insert into public.matches (request_id, gifter_id, receiver_id, post_id)
    values (v_request_id, uid, post.receiver_id, post.id)
    on conflict (request_id) do update set status = 'active'
    returning id into v_match_id;

  insert into public.gifts (match_id, gifter_id, receiver_id, post_id, amount_cents, is_anonymous, status, confirmed_at)
    values (v_match_id, uid, post.receiver_id, post.id, p_amount_cents, coalesce(p_is_anonymous, false), 'confirmed', now())
    returning id into v_gift_id;
  update public.posts set raised_cents = raised_cents + p_amount_cents
    where id = post.id
    returning * into post;
  if post.raised_cents >= post.goal_cents then
    perform private.close_post(post.id);
  end if;

  -- Boards reflect the gift now instead of at the next 5-minute refresh.
  perform private.refresh_leaderboard();
  return v_gift_id;
end $$;

-- A "helped" board: how many different people each gifter has helped, from
-- confirmed gifts. It's counted live rather than from the monthly view,
-- because distinct people can't be added up month by month. It follows the
-- gifted board's opt-out. get_leaderboard and get_my_rank return the count in
-- total_cents for this board.
create or replace function private.leaderboard_rows(p_viewer uuid, p_board text, p_period text, p_scope text)
returns table (user_id uuid, total_cents bigint, user_rank bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_board not in ('gifted', 'received', 'helped') then
    raise exception 'invalid_board' using errcode = '22023';
  end if;
  if p_period not in ('all_time', 'month') then
    raise exception 'invalid_period' using errcode = '22023';
  end if;
  if p_scope not in ('global', 'friends') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  return query
    with totals as (
      select l.user_id, sum(l.total_cents)::bigint as total_cents
      from private.leaderboard_monthly l
      where p_board <> 'helped' and l.board = p_board
        and (p_period = 'all_time' or l.month = date_trunc('month', now() at time zone 'utc'))
      group by l.user_id
      union all
      select g.gifter_id, count(distinct g.receiver_id)::bigint
      from public.gifts g
      where p_board = 'helped' and g.status = 'confirmed'
        and g.gifter_id is not null and g.receiver_id is not null
        and (p_period = 'all_time'
             or date_trunc('month', g.confirmed_at at time zone 'utc') = date_trunc('month', now() at time zone 'utc'))
      group by g.gifter_id
    )
    select t.user_id, t.total_cents, rank() over (order by t.total_cents desc)
    from totals t
    join public.profiles pr on pr.id = t.user_id
    join public.privacy_settings s on s.user_id = t.user_id
    where not pr.leaderboard_excluded
      and (case p_board when 'received' then s.on_received_board else s.on_gifted_board end)
      and not private.is_blocked(p_viewer, t.user_id)
      and (p_scope = 'global' or t.user_id = p_viewer or private.are_friends(p_viewer, t.user_id));
end $$;

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant execute on function public.demo_send_gift(uuid, integer, boolean) to authenticated;
