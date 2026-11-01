begin;
select plan(28);

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

-- Follows
select lives_ok($$select public.follow_user((select bob from u))$$, 'alice follows bob');
select lives_ok($$select public.follow_user((select bob from u))$$, 'following twice is harmless');
select is((select count(*)::int from public.follows), 1, 'one row per follow');
select is((select is_following from public.get_follows()), true, 'alice is following bob');
select is((select follows_me from public.get_follows()), false, 'bob does not follow alice yet');
select throws_ok($$select public.follow_user((select alice from u))$$, 'cannot_follow_self', 'cannot follow yourself');
select is((select count(*)::int from public.get_friend_activity()), 0, 'a one-way follow is not enough for activity');

select tests.login((select carol from u));
select is((select count(*)::int from public.follows), 0, 'strangers cannot read follows');

select tests.login((select bob from u));
select is((select count(*)::int from public.notifications where type = 'new_follower'), 1, 'only the first follow notifies');
select is((select follows_me from public.get_follows()), true, 'bob sees his follower');
select lives_ok($$select public.remove_follower((select alice from u))$$, 'bob removes alice as a follower');
select is((select count(*)::int from public.get_follows()), 0, 'removing the follower ends the connection');
select lives_ok($$select public.follow_user((select alice from u))$$, 'bob follows alice');

select tests.login((select alice from u));
select lives_ok($$select public.follow_user((select bob from u))$$, 'alice follows bob back');
select is((select is_following and follows_me from public.get_follows()), true, 'a mutual follow shows both flags');
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
select is((select count(*)::int from public.get_follows()), 0, 'blocking removes follows in both directions');
select tests.login((select alice from u));
select is((select count(*)::int from public.search_posts(p_query := 'groceries')), 0, 'blocked user is gone from discover');
select is((select count(*)::int from public.get_swipe_feed() where receiver_first_name = 'Bob'), 0, 'blocked user is gone from the feed');
select is((select count(*)::int from public.search_users('bob')), 0, 'blocked user is gone from search');
select throws_ok($$select public.follow_user((select bob from u))$$, 'user_not_found', 'cannot follow a blocked user');
select tests.login((select bob from u));
select lives_ok($$select public.unblock_user((select alice from u))$$, 'bob unblocks alice');
select lives_ok($$select public.follow_user((select alice from u))$$, 'bob follows alice again');
select lives_ok($$select public.unfollow_user((select alice from u))$$, 'bob unfollows alice');
select is((select count(*)::int from public.get_follows()), 0, 'unfollowing ends a one-way follow');
select tests.logout();

select * from finish();
rollback;
