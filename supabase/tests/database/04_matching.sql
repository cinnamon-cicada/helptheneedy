begin;
select plan(20);

create temp table u on commit drop as
  select tests.create_user('receiver') as receiver, tests.create_user('gifter') as gifter, tests.create_user('third') as third;
grant select on u to authenticated;
create temp table p on commit drop as
  select tests.create_open_post((select receiver from u), 10000, 'First post') as a,
         tests.create_open_post((select receiver from u), 10000, 'Second post') as b;
grant select on p to authenticated;

select tests.login((select gifter from u));
select is((select count(*)::int from public.get_swipe_feed()), 2, 'feed shows open posts');
select is((select receiver_first_name from public.get_swipe_feed() limit 1), 'Receiver', 'feed shows first name only');
select is((select public.record_swipe((select b from p), 'left')), null, 'left swipe creates no request');
select is((select count(*)::int from public.get_swipe_feed()), 1, 'swiped post leaves the feed');
select is((select count(*)::int from public.match_requests), 0, 'no request after passing');

create temp table r on commit drop as select public.record_swipe((select a from p), 'right') as id;
grant select on r to authenticated;
select is((select public.record_swipe((select a from p), 'right')), (select id from r), 'swiping twice returns the same request');
select is((select count(*)::int from public.match_requests), 1, 'swiping twice creates one request');
select is((select public.record_swipe((select a from p), 'left')), null, 'a later left swipe returns nothing');
select is((select direction::text from public.swipes where post_id = (select a from p)), 'right', 'and does not undo the offer');
select isnt((select public.record_swipe((select b from p), 'right')), null, 'offering from Discover upgrades an earlier pass');

select tests.login((select receiver from u));
select is((select count(*)::int from public.notifications where type = 'match_request'), 2, 'receiver is notified of each request');
select is((select count(*)::int from public.get_swipe_feed()), 0, 'own posts are not in the feed');
select throws_ok($$select public.record_swipe((select a from p), 'right')$$, 'cannot_swipe_own_post', 'cannot swipe your own post');

select tests.login((select third from u));
select throws_ok($$select public.respond_to_request((select id from r), true)$$, 'request_not_found', 'only the receiver can respond');
select is((select count(*)::int from public.post_gift_instructions), 0, 'instructions stay hidden before matching');

select tests.login((select receiver from u));
create temp table m on commit drop as select public.respond_to_request((select id from r), true) as id;
grant select on m to authenticated;
select is((select public.respond_to_request((select id from r), true)), (select id from m), 'accepting twice returns the same match');
select is((select count(*)::int from public.matches), 1, 'accepting twice creates one match');
select throws_ok($$select public.respond_to_request((select id from r), false)$$, 'request_not_pending', 'cannot decline after accepting');

select tests.login((select gifter from u));
select is((select count(*)::int from public.post_gift_instructions where post_id = (select a from p)), 1, 'matched gifter sees instructions');
select is((select count(*)::int from public.notifications where type = 'match_created'), 1, 'gifter is notified of the match');
select tests.logout();

select * from finish();
rollback;
