begin;
select plan(19);

create temp table u on commit drop as
  select tests.create_user('demo_bot') as bot, tests.create_user('real_need') as real,
         tests.create_user('giver') as giver, tests.create_user('giver2') as giver2;
grant select on u to authenticated;
update public.profiles set is_demo = true where id = (select bot from u);

create temp table p on commit drop as
  select tests.create_open_post((select bot from u), 1000, 'Matcha') as demo,
         tests.create_open_post((select real from u), 1000, 'Rent') as real;
grant select on p to authenticated;

select is(
  has_column_privilege('authenticated', 'public.profiles', 'is_demo', 'select'),
  false, 'the demo flag is not readable by clients'
);

select tests.login_anon();
select throws_ok($$select public.demo_send_gift((select demo from p), 500)$$, '42501', null,
  'signed-out users cannot send demo gifts');
select tests.logout();

select tests.login((select giver from u));
select throws_ok($$select public.demo_send_gift((select real from p), 500)$$, 'receiver_not_demo',
  'real receivers keep the confirmation flow');
select throws_ok($$select public.demo_send_gift((select demo from p), 50)$$, 'invalid_amount', 'gift below $1 is rejected');
select throws_ok($$select public.demo_send_gift((select demo from p), 1001)$$, 'invalid_amount',
  'gift above the remaining amount is rejected');

create temp table g on commit drop as select public.demo_send_gift((select demo from p), 300) as first;
grant select on g to authenticated;
select is((select status from public.gifts where id = (select first from g)), 'confirmed'::public.gift_status,
  'demo gifts are confirmed right away');
select is((select gifter_id = (select giver from u) and receiver_id = (select bot from u) from public.gifts where id = (select first from g)),
  true, 'the gift is tagged with giver and receiver');
select is((select raised_cents from public.posts where id = (select demo from p)), 300, 'the gift counts toward the post');
select is((select total_cents from public.get_my_rank('gifted')), 300::bigint,
  'the board reflects the gift without waiting for a refresh');
select is((select gifted_cents from public.get_my_profile()), 300::bigint, 'your profile total includes the gift');

select public.demo_send_gift((select demo from p), 200, true);
select is((select count(*)::int from public.matches where gifter_id = (select giver from u)), 1,
  'a second gift reuses the same match');
select is((select raised_cents from public.posts where id = (select demo from p)),
  (select sum(amount_cents)::int from public.gifts where post_id = (select demo from p) and status = 'confirmed'),
  'raised_cents equals the sum of confirmed gifts');

select tests.login((select giver2 from u));
select public.demo_send_gift((select demo from p), 500);
select is((select status from public.posts where id = (select demo from p)), 'closed'::public.post_status,
  'reaching the goal closes the post');
select is((select array_agg(username order by user_rank) from public.get_leaderboard('gifted', 'month')),
  array['giver', 'giver2'], 'the monthly board ranks both givers');
select throws_ok($$select public.demo_send_gift((select demo from p), 100)$$, 'post_not_open',
  'closed posts take no more gifts');

select tests.logout();
create temp table p3 on commit drop as select tests.create_open_post((select real from u), 5000, 'Shoes') as id;
grant select on p3 to authenticated;
update public.profiles set is_demo = true where id = (select real from u);
select tests.login((select giver from u));
select public.demo_send_gift((select id from p3), 100);
select is((select total_cents from public.get_my_rank('helped', 'month')), 2::bigint,
  'the helped board counts different people, not gifts');
select is((select total_cents from public.get_leaderboard('helped', 'all_time') where username = 'giver2'), 1::bigint,
  'one person helped once counts once');
select tests.logout();
update public.profiles set is_demo = false where id = (select real from u);

select tests.logout();
create temp table p2 on commit drop as select tests.create_open_post((select bot from u), 1000, 'Boots') as id;
grant select on p2 to authenticated;
select tests.login((select bot from u));
select throws_ok($$select public.demo_send_gift((select id from p2), 100)$$, 'cannot_gift_own_post',
  'you cannot gift your own post');

select tests.login((select real from u));
select throws_ok($$select public.demo_send_gift(gen_random_uuid(), 100)$$, 'post_not_found', 'unknown posts are rejected');

select * from finish();
rollback;
