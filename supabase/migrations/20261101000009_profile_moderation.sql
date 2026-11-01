-- Profile reads, reports, and moderator tools.

create table public.moderators (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  target_post_id uuid references public.posts (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);
create index reports_status_created_at_idx on public.reports (status, created_at);

create table public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_id uuid not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_log enable row level security;

create function private.is_moderator(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.moderators m where m.user_id = p_user);
$$;

create function private.require_moderator() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if not private.is_moderator(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return uid;
end $$;

create policy reports_select on public.reports for select to authenticated
  using (private.is_moderator(auth.uid()));
create policy moderation_log_select on public.moderation_log for select to authenticated
  using (private.is_moderator(auth.uid()));

create function public.get_my_profile()
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_path text,
  intent public.user_intent,
  general_location text,
  is_onboarded boolean,
  gifted_cents bigint,
  received_cents bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return query
    select pr.id, pr.username, pr.display_name, pr.bio, pr.avatar_path, pr.intent, pr.general_location,
           pr.onboarded_at is not null,
           (select coalesce(sum(g.amount_cents), 0)::bigint from public.gifts g
             where g.gifter_id = uid and g.status = 'confirmed'),
           (select coalesce(sum(g.amount_cents), 0)::bigint from public.gifts g
             where g.receiver_id = uid and g.status = 'confirmed')
    from public.profiles pr
    where pr.id = uid;
end $$;

-- Totals are null unless the person chose to share them.
create function public.get_public_profile(p_user_id uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_path text,
  gifted_cents bigint,
  received_cents bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  return query
    select pr.id, pr.username, pr.display_name, pr.bio, pr.avatar_path,
           case when s.show_gifted_total then
             (select coalesce(sum(g.amount_cents), 0)::bigint from public.gifts g
               where g.gifter_id = pr.id and g.status = 'confirmed') end,
           case when s.show_received_total then
             (select coalesce(sum(g.amount_cents), 0)::bigint from public.gifts g
               where g.receiver_id = pr.id and g.status = 'confirmed') end
    from public.profiles pr
    join public.privacy_settings s on s.user_id = pr.id
    where pr.id = p_user_id
      and pr.onboarded_at is not null
      and not private.is_blocked(uid, pr.id);
end $$;

create function public.report(p_target_user_id uuid default null, p_target_post_id uuid default null, p_reason text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  new_id uuid;
begin
  perform private.rate_limit(uid, 'report', 20, interval '1 day');
  if p_target_user_id is null and p_target_post_id is null then
    raise exception 'report_target_required' using errcode = '22023';
  end if;
  insert into public.reports (reporter_id, target_user_id, target_post_id, reason)
    values (uid, p_target_user_id, p_target_post_id, p_reason)
    returning id into new_id;
  return new_id;
end $$;

create function public.mod_resolve_report(p_report_id uuid, p_detail text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_moderator();
begin
  update public.reports set status = 'resolved' where id = p_report_id;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;
  insert into public.moderation_log (moderator_id, action, target_id, detail)
    values (uid, 'resolve_report', p_report_id, p_detail);
end $$;

create function public.mod_remove_post(p_post_id uuid, p_detail text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_moderator();
begin
  update public.posts set status = 'removed' where id = p_post_id;
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  insert into public.moderation_log (moderator_id, action, target_id, detail)
    values (uid, 'remove_post', p_post_id, p_detail);
end $$;

create function public.mod_set_leaderboard_excluded(p_user_id uuid, p_excluded boolean, p_detail text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_moderator();
begin
  update public.profiles set leaderboard_excluded = p_excluded where id = p_user_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  insert into public.moderation_log (moderator_id, action, target_id, detail)
    values (uid, case when p_excluded then 'exclude_from_leaderboard' else 'include_in_leaderboard' end,
            p_user_id, p_detail);
end $$;

-- Accounts worth a look: gifts going both ways between a pair, or large confirmed totals.
create function public.mod_get_flagged_accounts(p_large_total_cents bigint default 100000)
returns table (user_id uuid, reason text, related_user_id uuid, total_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_moderator();
  return query
    select a.gifter_id, 'back_and_forth'::text, a.receiver_id, sum(a.amount_cents)::bigint
    from public.gifts a
    where a.status = 'confirmed'
      and a.gifter_id is not null and a.receiver_id is not null
      and exists (
        select 1 from public.gifts b
        where b.status = 'confirmed' and b.gifter_id = a.receiver_id and b.receiver_id = a.gifter_id
      )
    group by a.gifter_id, a.receiver_id
    union all
    select g.gifter_id, 'large_total_gifted', null::uuid, sum(g.amount_cents)::bigint
    from public.gifts g
    where g.status = 'confirmed' and g.gifter_id is not null
    group by g.gifter_id
    having sum(g.amount_cents) >= p_large_total_cents
    union all
    select g.receiver_id, 'large_total_received', null::uuid, sum(g.amount_cents)::bigint
    from public.gifts g
    where g.status = 'confirmed' and g.receiver_id is not null
    group by g.receiver_id
    having sum(g.amount_cents) >= p_large_total_cents;
end $$;

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant select on public.reports, public.moderation_log to authenticated;

grant execute on function
  private.is_moderator(uuid),
  public.get_my_profile(),
  public.get_public_profile(uuid),
  public.report(uuid, uuid, text),
  public.mod_resolve_report(uuid, text),
  public.mod_remove_post(uuid, text),
  public.mod_set_leaderboard_excluded(uuid, boolean, text),
  public.mod_get_flagged_accounts(bigint)
to authenticated;
