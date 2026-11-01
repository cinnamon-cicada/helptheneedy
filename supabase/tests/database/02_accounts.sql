begin;
select plan(14);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'new@example.test');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 1, 'signup creates a profile');
select is((select on_received_board from public.privacy_settings where user_id = '00000000-0000-0000-0000-000000000001'), false, 'received board is opt-in');
select is((select on_gifted_board from public.privacy_settings where user_id = '00000000-0000-0000-0000-000000000001'), true, 'gifted board is on by default');

select tests.login('00000000-0000-0000-0000-000000000001');
select throws_ok($$select public.update_privacy()$$, 'onboarding_required', 'most RPCs need onboarding');
select throws_ok($$select public.complete_onboarding('newuser', 'New', 'both', false)$$, 'must_be_adult', 'under-18 signup is rejected');
select lives_ok($$select public.complete_onboarding('NewUser', 'New User', 'both', true)$$, 'adult can finish onboarding');
select is((select username from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 'newuser', 'username is lowercased');
select throws_ok(
  $$select public.update_profile(p_avatar_path := 'someone-else/a.jpg')$$,
  'invalid_storage_path', 'avatar must be in your own folder'
);
select tests.logout();
select tests.create_user('taken');
select tests.login('00000000-0000-0000-0000-000000000001');
select throws_ok($$select public.complete_onboarding('taken', 'X', 'both', true)$$, 'username_taken', 'username is unique');

select lives_ok($$select public.update_privacy(p_on_received_board := true)$$, 'can opt in');
select is((select on_received_board from public.privacy_settings), true, 'privacy change is saved');
select is((select share_activity from public.privacy_settings), true, 'other settings are unchanged');
select throws_ok($$update public.profiles set bio = 'x'$$, '42501', null, 'cannot write tables directly');
select tests.logout();

select tests.login_anon();
select throws_ok($$select public.update_privacy()$$, '42501', null, 'signed-out users cannot call RPCs');
select tests.logout();

select * from finish();
rollback;
