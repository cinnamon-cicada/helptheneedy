-- Local and CI only: helpers for the pgTAP tests in supabase/tests/database.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

-- Creates a signed-up user who has finished onboarding.
create function tests.create_user(p_name text) returns uuid
language plpgsql as $$
declare
  uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (uid, p_name || '@example.test');
  update public.profiles
    set username = p_name, display_name = initcap(p_name) || ' Test', intent = 'both',
        is_adult_confirmed = true, onboarded_at = now()
    where id = uid;
  return uid;
end $$;

create function tests.login(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end $$;

create function tests.login_anon() returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

create function tests.logout() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Creates an open post, as the post's receiver, then signs back out.
create function tests.create_open_post(p_receiver uuid, p_goal integer default 10000, p_title text default 'Need help') returns uuid
language plpgsql as $$
declare
  post_id uuid;
begin
  perform tests.login(p_receiver);
  post_id := public.create_post(p_title, 'Story about ' || p_title, 'food', p_goal);
  perform public.set_gift_instructions(post_id, 'Send to @handle');
  perform public.publish_post(post_id);
  perform tests.logout();
  return post_id;
end $$;

-- Creates a match between the gifter and the post's receiver, then signs back out.
create function tests.create_match(p_gifter uuid, p_receiver uuid, p_post uuid) returns uuid
language plpgsql as $$
declare
  request_id uuid;
  match_id uuid;
begin
  perform tests.login(p_gifter);
  request_id := public.record_swipe(p_post, 'right');
  perform tests.login(p_receiver);
  match_id := public.respond_to_request(request_id, true);
  perform tests.logout();
  return match_id;
end $$;

-- Records and confirms a gift, then signs back out.
create function tests.create_confirmed_gift(p_gifter uuid, p_receiver uuid, p_match uuid, p_amount integer, p_anonymous boolean default false) returns uuid
language plpgsql as $$
declare
  gift_id uuid;
begin
  perform tests.login(p_gifter);
  gift_id := public.record_gift(p_match, p_amount, p_anonymous);
  perform tests.login(p_receiver);
  perform public.respond_to_gift(gift_id, true);
  perform tests.logout();
  return gift_id;
end $$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
