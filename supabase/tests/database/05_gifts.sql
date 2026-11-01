begin;
select plan(25);

create temp table u on commit drop as
  select tests.create_user('receiver') as receiver, tests.create_user('gifter') as gifter, tests.create_user('gifter2') as gifter2, tests.create_user('third') as third;
grant select on u to authenticated;
create temp table p on commit drop as select tests.create_open_post((select receiver from u), 1000) as id;
grant select on p to authenticated;
create temp table m on commit drop as
  select tests.create_match((select gifter from u), (select receiver from u), (select id from p)) as a,
         tests.create_match((select gifter2 from u), (select receiver from u), (select id from p)) as b;
grant select on m to authenticated;

select tests.login((select third from u));
select throws_ok($$select public.record_gift((select a from m), 500)$$, 'match_not_found', 'gifts need your own match');

select tests.login((select receiver from u));
select throws_ok($$select public.record_gift((select a from m), 500)$$, 'match_not_found', 'receiver cannot record a gift');

select tests.login((select gifter from u));
select throws_ok($$select public.record_gift((select a from m), 50)$$, 'invalid_amount', 'gift below $1 is rejected');
select throws_ok($$select public.record_gift((select a from m), 1001)$$, 'invalid_amount', 'gift above remaining is rejected');
create temp table g on commit drop as select public.record_gift((select a from m), 400) as first;
grant select on g to authenticated;
select throws_ok($$select public.record_gift((select a from m), 100)$$, 'gift_already_pending', 'one pending gift per match');
select is((select raised_cents from public.posts where id = (select id from p)), 0, 'a recorded gift does not count yet');
select throws_ok($$select public.respond_to_gift((select first from g), true)$$, 'gift_not_found', 'gifter cannot confirm their own gift');

select tests.login((select third from u));
select throws_ok($$select public.respond_to_gift((select first from g), true)$$, 'gift_not_found', 'strangers cannot confirm');
select is((select count(*)::int from public.gifts), 0, 'strangers cannot read gifts');
select throws_ok($$select public.delete_post((select id from p))$$, 'post_not_found', 'others cannot delete a post');

select tests.login((select receiver from u));
select is((select count(*)::int from public.notifications where type = 'gift_recorded'), 1, 'receiver is notified');
select is((select public.respond_to_gift((select first from g), true))::text, 'confirmed', 'receiver confirms');
select is((select public.respond_to_gift((select first from g), true))::text, 'confirmed', 'confirming twice is harmless');
select is((select raised_cents from public.posts where id = (select id from p)), 400, 'confirming twice counts once');
select throws_ok($$select public.respond_to_gift((select first from g), false)$$, 'gift_not_pending', 'cannot dispute after confirming');

select tests.login((select gifter from u));
select throws_ok($$select public.cancel_gift((select first from g))$$, 'gift_not_pending', 'cannot cancel a confirmed gift');
insert into g select public.record_gift((select a from m), 100);
select lives_ok($$select public.cancel_gift((select first from g where first <> (select first from g limit 1)))$$, 'gifter cancels a pending gift');

insert into g select public.record_gift((select a from m), 100);
select tests.login((select receiver from u));
select is(
  (select public.respond_to_gift((select id from public.gifts where status = 'pending' limit 1), false))::text,
  'disputed', 'receiver disputes'
);
select is((select raised_cents from public.posts where id = (select id from p)), 400, 'disputed gift does not count');

select tests.login((select gifter2 from u));
create temp table g2 on commit drop as select public.record_gift((select b from m), 600) as id;
grant select on g2 to authenticated;
select tests.login((select receiver from u));
select lives_ok($$select public.respond_to_gift((select id from g2), true)$$, 'final gift confirmed');
select is((select status::text from public.posts where id = (select id from p)), 'closed', 'post closes at goal');
select is(
  (select raised_cents from public.posts where id = (select id from p)),
  (select sum(amount_cents)::int from public.gifts where status = 'confirmed' and post_id = (select id from p)),
  'raised_cents equals the sum of confirmed gifts'
);
select throws_ok($$select public.delete_post((select id from p))$$, 'post_has_gifts', 'post with gifts cannot be deleted');

select tests.login((select gifter from u));
select throws_ok($$select public.record_gift((select a from m), 100)$$, 'invalid_amount', 'nothing left to give once the goal is met');
select is((select count(*)::int from public.posts where id = (select id from p)), 1, 'matched gifter still sees the closed post');
select tests.logout();

select * from finish();
rollback;
