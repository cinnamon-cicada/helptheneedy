begin;
select plan(9);

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
select is((select count(*)::int from public.search_posts()), 2, 'discover lists open posts');
select is((select title from public.search_posts(p_query := 'groceries')), 'Groceries for family', 'keyword search');
select is((select title from public.search_posts(p_category := 'transport')), 'Car repair', 'category filter');
select is((select title from public.search_posts(p_max_remaining_cents := 1000)), 'Groceries for family', 'remaining filter');
select is((select title from public.search_posts(p_location := 'nash')), 'Car repair', 'location filter');
select is((select count(*)::int from public.search_posts(p_location := '%')), 0, 'wildcards are escaped');
select is((select title from public.search_posts(p_sort := 'nearby') limit 1), 'Car repair', 'nearby sorts your location first');
select throws_ok($$select * from public.search_posts(p_sort := 'bad')$$, 'invalid_sort', 'unknown sort is rejected');

create temp table page1 on commit drop as select * from public.search_posts(p_limit := 1);
grant select on page1 to authenticated;
select isnt(
  (select id from public.search_posts(p_limit := 1,
     p_cursor_value := (select sort_value from page1), p_cursor_id := (select id from page1))),
  (select id from page1), 'the next page has no duplicates'
);

select tests.logout();

select * from finish();
rollback;
