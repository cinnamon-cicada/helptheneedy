begin;
select plan(7);

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'every public table has RLS enabled'
);
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
  0, 'clients cannot write to tables directly'
);
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  0, 'signed-out users have no table access'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')),
  0, 'signed-out users cannot call public functions'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and not coalesce(p.proconfig::text like '%search_path=%', false)),
  0, 'every security definer function pins its search_path'
);
select is(
  has_column_privilege('authenticated', 'public.profiles', 'leaderboard_excluded', 'select'),
  false, 'private profile columns are not readable'
);
select is(
  has_column_privilege('authenticated', 'public.profiles', 'general_location', 'select'),
  false, 'profile location is not readable'
);

select * from finish();
rollback;
