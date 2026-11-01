begin;
select plan(15);

create temp table u on commit drop as
  select tests.create_user('alice') as alice, tests.create_user('bob') as bob, tests.create_user('carol') as carol;
grant select on u to authenticated;
create temp table p on commit drop as
  select tests.create_open_post((select bob from u), 1000, 'Groceries for family') as a,
         tests.create_open_post((select carol from u), 2000, 'Car repair') as b;
grant select on p to authenticated;
update public.posts set general_location = 'Nashville', category = 'transport' where id = (select b from p);
update public.profiles set general_location = 'nashville' where id = (select alice from u);

select tests.login((select alice from u));

-- Friends
create temp table f on commit drop as select public.request_friend((select bob from u)) as id;
grant select on f to authenticated;
select is((select public.request_friend((select bob from u))), (select id from f), 'requesting twice is harmless');
select is((select count(*)::int from public.get_friends()), 0, 'not friends until accepted');
select throws_ok($$select public.respond_friend((select id from f), true)$$, 'cannot_respond_to_own_request', 'cannot accept your own request');

select tests.login((select carol from u));
select throws_ok($$select public.respond_friend((select id from f), true)$$, 'friendship_not_found', 'strangers cannot accept');

select tests.login((select bob from u));
select lives_ok($$select public.respond_friend((select id from f), true)$$, 'recipient accepts');
select is((select count(*)::int from public.get_friends()), 1, 'now friends');
select tests.logout();

-- Activity feed
create temp table m on commit drop as
  select tests.create_match((select bob from u), (select carol from u), (select b from p)) as id;
select tests.create_confirmed_gift((select bob from u), (select carol from u), (select id from m), 300);
select tests.create_confirmed_gift((select bob from u), (select carol from u), (select id from m), 200, true);

select tests.login((select alice from u));
select is((select count(*)::int from public.get_friend_activity()), 1, 'activity omits anonymous gifts');
select is((select amount_cents from public.get_friend_activity()), 300, 'activity shows the public gift');
select tests.logout();

update public.privacy_settings set share_activity = false where user_id = (select bob from u);
select tests.login((select alice from u));
select is((select count(*)::int from public.get_friend_activity()), 0, 'activity honors share_activity');

-- Blocking, in both directions
select tests.login((select bob from u));
select lives_ok($$select public.block_user((select alice from u))$$, 'bob blocks alice');
select is((select count(*)::int from public.get_friends()), 0, 'blocking removes the friendship');
select tests.login((select alice from u));
select is((select count(*)::int from public.search_posts(p_query := 'groceries')), 0, 'blocked user is gone from discover');
select is((select count(*)::int from public.get_swipe_feed() where receiver_first_name = 'Bob'), 0, 'blocked user is gone from the feed');
select is((select count(*)::int from public.search_users('bob')), 0, 'blocked user is gone from search');
select throws_ok($$select public.request_friend((select bob from u))$$, 'user_not_found', 'cannot friend a blocked user');
select tests.logout();

select * from finish();
rollback;
