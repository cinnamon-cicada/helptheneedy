begin;
select plan(16);

create temp table t on commit drop as
  select tests.create_user('owner') as owner, tests.create_user('other') as other;
grant select on t to authenticated;

select tests.login((select owner from t));
create temp table d on commit drop as select public.create_post('Rent', 'Need rent', 'housing', 5000) as id;
grant select on d to authenticated;

select throws_ok($$select public.create_post('', 's', 'c', 1000)$$, '23514', null, 'empty title is rejected');
select throws_ok($$select public.create_post('t', 's', 'c', 50)$$, '23514', null, 'goal below minimum is rejected');
select throws_ok($$select public.create_post('t', 's', 'c', 2000000)$$, '23514', null, 'goal above maximum is rejected');
select throws_ok($$select public.publish_post((select id from d))$$, 'gift_instructions_required', 'publishing needs gift instructions');
select lives_ok($$select public.set_gift_instructions((select id from d), 'Venmo @rent')$$, 'owner sets instructions');
select lives_ok($$select public.publish_post((select id from d))$$, 'owner publishes');
select lives_ok($$select public.publish_post((select id from d))$$, 'publishing twice is harmless');
select is((select raised_cents from public.posts where id = (select id from d)), 0, 'new post has nothing raised');

select throws_ok(
  format($$select public.add_post_photo('%s', 'not-mine/a.jpg')$$, (select id from d)),
  'invalid_storage_path', 'photo must be in your own folder'
);
do $$
declare i integer;
begin
  for i in 1..5 loop
    perform public.add_post_photo((select id from d), auth.uid()::text || '/' || i || '.jpg');
  end loop;
end $$;
select throws_ok(
  format($$select public.add_post_photo('%s', '%s/6.jpg')$$, (select id from d), auth.uid()),
  'too_many_photos', 'a post allows 5 photos'
);

select tests.login((select other from t));
select is((select count(*)::int from public.posts where id = (select id from d)), 1, 'others can read an open post');
select is((select count(*)::int from public.post_photos), 5, 'others can read its photos');
select is((select count(*)::int from public.post_gift_instructions), 0, 'others cannot read gift instructions');
select throws_ok($$select public.close_post((select id from d))$$, 'post_not_found', 'others cannot close a post');

select tests.login((select owner from t));
select lives_ok($$select public.close_post((select id from d))$$, 'owner closes');
select tests.login((select other from t));
select is((select count(*)::int from public.posts where id = (select id from d)), 0, 'closed post leaves public view');
select tests.logout();

select * from finish();
rollback;
