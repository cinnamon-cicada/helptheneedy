-- Leaderboards built from confirmed gifts, refreshed every 5 minutes.

create extension if not exists pg_cron with schema pg_catalog;

create materialized view private.leaderboard_monthly as
  select g.gifter_id as user_id, 'gifted'::text as board,
         date_trunc('month', g.confirmed_at at time zone 'utc') as month,
         sum(g.amount_cents)::bigint as total_cents
  from public.gifts g
  where g.status = 'confirmed' and g.gifter_id is not null
  group by 1, 3
  union all
  select g.receiver_id, 'received',
         date_trunc('month', g.confirmed_at at time zone 'utc'),
         sum(g.amount_cents)::bigint
  from public.gifts g
  where g.status = 'confirmed' and g.receiver_id is not null
  group by 1, 3;

create unique index leaderboard_monthly_key on private.leaderboard_monthly (user_id, board, month);

create function private.refresh_leaderboard() returns void
language sql security definer set search_path = '' as $$
  refresh materialized view concurrently private.leaderboard_monthly;
$$;

create function private.leaderboard_rows(p_viewer uuid, p_board text, p_period text, p_scope text)
returns table (user_id uuid, total_cents bigint, user_rank bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_board not in ('gifted', 'received') then
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
      where l.board = p_board
        and (p_period = 'all_time' or l.month = date_trunc('month', now() at time zone 'utc'))
      group by l.user_id
    )
    select t.user_id, t.total_cents, rank() over (order by t.total_cents desc)
    from totals t
    join public.profiles pr on pr.id = t.user_id
    join public.privacy_settings s on s.user_id = t.user_id
    where not pr.leaderboard_excluded
      and (case p_board when 'gifted' then s.on_gifted_board else s.on_received_board end)
      and not private.is_blocked(p_viewer, t.user_id)
      and (p_scope = 'global' or t.user_id = p_viewer or private.are_friends(p_viewer, t.user_id));
end $$;

create function public.get_leaderboard(
  p_board text,
  p_period text default 'all_time',
  p_scope text default 'global',
  p_offset integer default 0,
  p_limit integer default 50
)
returns table (user_rank bigint, user_id uuid, username text, display_name text, avatar_path text, total_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  return query
    select r.user_rank, r.user_id, pr.username, pr.display_name, pr.avatar_path, r.total_cents
    from private.leaderboard_rows(uid, p_board, p_period, p_scope) r
    join public.profiles pr on pr.id = r.user_id
    order by r.user_rank, pr.username
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $$;

-- No row means you aren't on this board.
create function public.get_my_rank(p_board text, p_period text default 'all_time', p_scope text default 'global')
returns table (user_rank bigint, total_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  return query
    select r.user_rank, r.total_cents
    from private.leaderboard_rows(uid, p_board, p_period, p_scope) r
    where r.user_id = uid;
end $$;

select cron.schedule('refresh-leaderboard', '*/5 * * * *', 'select private.refresh_leaderboard()');
select cron.schedule('purge-rate-events', '17 * * * *',
  $$delete from private.rate_events where created_at < now() - interval '2 days'$$);

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant execute on function
  public.get_leaderboard(text, text, text, integer, integer),
  public.get_my_rank(text, text, text)
to authenticated;
