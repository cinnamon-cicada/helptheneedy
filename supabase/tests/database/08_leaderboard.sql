begin;
select plan(14);

create temp table u on commit drop as
  select tests.create_user('top') as top, tests.create_user('mid') as mid, tests.create_user('need') as need, tests.create_user('friend') as friend;
grant select on u to authenticated;
create temp table p on commit drop as select tests.create_open_post((select need from u), 100000) as id;
grant select on p to authenticated;
create temp table m on commit drop as
  select tests.create_match((select top from u), (select need from u), (select id from p)) as top,
         tests.create_match((select mid from u), (select need from u), (select id from p)) as mid;
grant select on m to authenticated;
select tests.create_confirmed_gift((select top from u), (select need from u), (select top from m), 5000);
select tests.create_confirmed_gift((select mid from u), (select need from u), (select mid from m), 1000, true);

-- Stays pending, so it must not count.
select tests.login((select mid from u));
select public.record_gift((select mid from m), 9000);
select tests.logout();

refresh materialized view private.leaderboard_monthly;

select tests.login((select friend from u));
select is((select array_agg(username order by user_rank) from public.get_leaderboard('gifted')), array['top', 'mid'], 'gifted board ranks by confirmed total');
select is((select total_cents from public.get_leaderboard('gifted') where username = 'mid'), 1000::bigint, 'pending gifts do not count, anonymous gifts do');
select is((select count(*)::int from public.get_leaderboard('received')), 0, 'received board is opt-in');
select is((select count(*)::int from public.get_my_rank('gifted')), 0, 'no rank when not on the board');
select is((select count(*)::int from public.get_leaderboard('gifted', 'month')), 2, 'monthly view includes this month');
select is((select count(*)::int from public.get_leaderboard('gifted', 'all_time', 'friends')), 0, 'friends scope excludes strangers');
select throws_ok($$select * from public.get_leaderboard('bad')$$, 'invalid_board', 'unknown board is rejected');
select public.follow_user((select top from u));

select tests.login((select top from u));
select public.follow_user((select friend from u));
select is((select user_rank from public.get_my_rank('gifted')), 1::bigint, 'your own rank');
select tests.login((select friend from u));
select is((select array_agg(username) from public.get_leaderboard('gifted', 'all_time', 'friends')), array['top'], 'friends scope includes mutual follows');

select tests.login((select need from u));
select public.update_privacy(p_on_received_board := true);
select is((select total_cents from public.get_my_rank('received')), 6000::bigint, 'opting in shows you on the received board');

select tests.login((select top from u));
select public.update_privacy(p_on_gifted_board := false);
select is((select array_agg(username) from public.get_leaderboard('gifted')), array['mid'], 'opting out removes you at once');
select public.update_privacy(p_on_gifted_board := true);
select tests.logout();

update public.profiles set leaderboard_excluded = true where id = (select top from u);
select tests.login((select mid from u));
select is((select array_agg(username) from public.get_leaderboard('gifted')), array['mid'], 'excluded accounts are removed');
select tests.logout();

select lives_ok($$select private.refresh_leaderboard()$$, 'concurrent refresh works');
select is(has_table_privilege('authenticated', 'private.leaderboard_monthly', 'select'), false, 'clients cannot read the view directly');

select * from finish();
rollback;
