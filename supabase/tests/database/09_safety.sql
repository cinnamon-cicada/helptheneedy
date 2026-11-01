begin;
select plan(24);

create temp table u on commit drop as
  select tests.create_user('mod') as mod, tests.create_user('alice') as alice, tests.create_user('bob') as bob;
grant select on u to authenticated;
insert into public.moderators (user_id) select mod from u;
create temp table p on commit drop as select tests.create_open_post((select bob from u), 5000) as id;
grant select on p to authenticated;

-- Profiles
select tests.login((select alice from u));
select is((select gifted_cents from public.get_public_profile((select bob from u))), null, 'totals are hidden by default');
select throws_ok($$select general_location from public.profiles$$, '42501', null, 'private columns cannot be selected');
select is((select count(*)::int from public.privacy_settings), 1, 'you only see your own settings');
select tests.login((select bob from u));
select public.update_privacy(p_show_gifted_total := true);
select tests.login((select alice from u));
select is((select gifted_cents from public.get_public_profile((select bob from u))), 0::bigint, 'shared totals are visible');

-- Reports
select throws_ok($$select public.report(p_reason := 'bad')$$, 'report_target_required', 'a report needs a target');
create temp table r on commit drop as select public.report((select bob from u), (select id from p), 'scam') as id;
grant select on r to authenticated;
select is((select count(*)::int from public.reports), 0, 'reporters cannot read the queue');
select throws_ok($$select public.mod_remove_post((select id from p))$$, 'forbidden', 'only moderators can remove posts');
select throws_ok($$select * from public.mod_get_flagged_accounts()$$, 'forbidden', 'only moderators see flagged accounts');

select tests.login((select mod from u));
select is((select count(*)::int from public.reports), 1, 'moderators read the queue');
select lives_ok($$select public.mod_remove_post((select id from p), 'scam')$$, 'moderator removes a post');
select lives_ok($$select public.mod_resolve_report((select id from r))$$, 'moderator resolves the report');
select is((select count(*)::int from public.moderation_log), 2, 'moderator actions are logged');

select tests.login((select alice from u));
select is((select count(*)::int from public.posts where id = (select id from p)), 0, 'removed posts are hidden');
select tests.login((select bob from u));
select throws_ok($$select public.update_post((select id from p), 'New')$$, 'post_removed', 'owner cannot edit a removed post');
select tests.logout();

-- Fake gifting flags
create temp table p2 on commit drop as
  select tests.create_open_post((select alice from u), 500000) as a, tests.create_open_post((select bob from u), 500000) as b;
create temp table m on commit drop as
  select tests.create_match((select bob from u), (select alice from u), (select a from p2)) as ba,
         tests.create_match((select alice from u), (select bob from u), (select b from p2)) as ab;
grant select on m to authenticated;
grant select on p2 to authenticated;
select tests.create_confirmed_gift((select bob from u), (select alice from u), (select ba from m), 200000);
select tests.create_confirmed_gift((select alice from u), (select bob from u), (select ab from m), 100);
select tests.login((select mod from u));
select is((select count(*)::int from public.mod_get_flagged_accounts() where reason = 'back_and_forth'), 2, 'back-and-forth gifts are flagged');
select is((select count(*)::int from public.mod_get_flagged_accounts() where reason = 'large_total_gifted'), 1, 'large totals are flagged');
select tests.logout();

-- Rate limits
select tests.login((select alice from u));
select public.create_post('t' || i, 's', 'c', 1000) from generate_series(1, 9) i;
select throws_ok($$select public.create_post('over', 's', 'c', 1000)$$, 'rate_limited', 'post creation is rate limited');
select tests.logout();

delete from private.rate_events;
-- Blocking ends what is open between two people
select tests.login((select bob from u));
create temp table bg on commit drop as select public.record_gift((select ba from m), 300000) as id;
grant select on bg to authenticated;
select public.block_user((select alice from u));
select tests.logout();
select is((select status::text from public.gifts where id = (select id from bg)), 'cancelled', 'blocking cancels pending gifts');
select is((select status::text from public.matches where id = (select ba from m)), 'closed', 'blocking closes matches');
select tests.login((select alice from u));
select is((select count(*)::int from public.get_public_profile((select bob from u))), 0, 'blocked profile is hidden');
select tests.logout();

-- Deleting an account
create temp table before_total on commit drop as
  select sum(amount_cents) as total from public.gifts where status = 'confirmed';
select tests.login((select bob from u));
select public.register_push_token('ExponentPushToken[bob]', 'ios');
select tests.logout();
delete from auth.users where id = (select bob from u);
select is((select count(*)::int from public.profiles where id = (select bob from u)), 0, 'deleting an account removes the profile');
select is((select count(*)::int from public.push_tokens), 0, 'and their push tokens');
select is((select sum(amount_cents) from public.gifts where status = 'confirmed'), (select total from before_total), 'gift records are kept');
select is((select count(*)::int from public.gifts where gifter_id = (select bob from u) or receiver_id = (select bob from u)), 0, 'and anonymized');

select * from finish();
rollback;
