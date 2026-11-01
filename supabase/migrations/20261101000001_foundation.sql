-- Accounts, blocks, notifications, and shared helpers.
-- Clients read through RLS and write through RPCs. Grants live in the grants migration.

create schema if not exists private;

-- Least privilege: clients get only what each migration grants. Signed-out users get nothing.
-- Each migration ends by revoking the default execute grant, then granting what it adds.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema private to authenticated;

create type public.user_intent as enum ('gifter', 'receiver', 'both');
create type public.post_status as enum ('draft', 'open', 'closed', 'removed');
create type public.swipe_direction as enum ('left', 'right');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.match_status as enum ('active', 'closed');
create type public.gift_status as enum ('pending', 'confirmed', 'disputed', 'cancelled');
create type public.friendship_status as enum ('pending', 'accepted');
create type public.report_status as enum ('open', 'resolved');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text check (char_length(display_name) between 1 and 80),
  bio text check (char_length(bio) <= 500),
  avatar_path text,
  intent public.user_intent,
  is_adult_confirmed boolean not null default false,
  general_location text check (char_length(general_location) <= 100),
  leaderboard_excluded boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.privacy_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  show_gifted_total boolean not null default false,
  show_received_total boolean not null default false,
  on_gifted_board boolean not null default true,
  on_received_board boolean not null default false,
  share_activity boolean not null default true,
  push_enabled boolean not null default true
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);
create index push_tokens_user_id_idx on public.push_tokens (user_id);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_id_idx on public.blocks (blocked_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

create table private.rate_events (
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_events_lookup_idx on private.rate_events (user_id, action, created_at);

-- Returns the signed-in user, rejecting anyone who hasn't finished onboarding.
create function private.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles p where p.id = uid and p.onboarded_at is not null) then
    raise exception 'onboarding_required' using errcode = '42501';
  end if;
  return uid;
end $$;

create function private.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b) or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

create function private.rate_limit(p_user uuid, p_action text, p_max integer, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.rate_events e
      where e.user_id = p_user and e.action = p_action and e.created_at > now() - p_window) >= p_max then
    raise exception 'rate_limited' using errcode = '42501';
  end if;
  insert into private.rate_events (user_id, action) values (p_user, p_action);
end $$;

create function private.notify(p_user uuid, p_type text, p_payload jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, payload) values (p_user, p_type, p_payload);
$$;

create function private.like_escape(p_text text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(p_text, '\', '\\'), '%', '\%'), '_', '\_');
$$;

create function private.require_own_path(p_user uuid, p_path text) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_path !~ ('^' || p_user::text || '/[^/]+$') then
    raise exception 'invalid_storage_path' using errcode = '22023';
  end if;
end $$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.privacy_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- RLS

alter table public.profiles enable row level security;
alter table public.privacy_settings enable row level security;
alter table public.push_tokens enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (onboarded_at is not null and not private.is_blocked(auth.uid(), id)));
create policy privacy_settings_select on public.privacy_settings for select to authenticated
  using (user_id = auth.uid());
create policy push_tokens_select on public.push_tokens for select to authenticated
  using (user_id = auth.uid());
create policy blocks_select on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.notifications;

-- Account RPCs. delete-account is an Edge Function because it also removes stored files.

create function public.complete_onboarding(
  p_username text,
  p_display_name text,
  p_intent public.user_intent,
  p_is_adult_confirmed boolean,
  p_avatar_path text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_is_adult_confirmed is not true then
    raise exception 'must_be_adult' using errcode = '22023';
  end if;
  if p_avatar_path is not null then
    perform private.require_own_path(uid, p_avatar_path);
  end if;
  update public.profiles
    set username = lower(p_username),
        display_name = p_display_name,
        intent = p_intent,
        is_adult_confirmed = true,
        avatar_path = coalesce(p_avatar_path, avatar_path),
        onboarded_at = coalesce(onboarded_at, now())
    where id = uid;
exception
  when unique_violation then
    raise exception 'username_taken' using errcode = '23505';
end $$;

create function public.update_profile(
  p_display_name text default null,
  p_bio text default null,
  p_avatar_path text default null,
  p_general_location text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if p_avatar_path is not null then
    perform private.require_own_path(uid, p_avatar_path);
  end if;
  update public.profiles
    set display_name = coalesce(p_display_name, display_name),
        bio = case when p_bio is null then bio else nullif(p_bio, '') end,
        avatar_path = coalesce(p_avatar_path, avatar_path),
        general_location = case when p_general_location is null then general_location else nullif(p_general_location, '') end
    where id = uid;
end $$;

create function public.update_privacy(
  p_show_gifted_total boolean default null,
  p_show_received_total boolean default null,
  p_on_gifted_board boolean default null,
  p_on_received_board boolean default null,
  p_share_activity boolean default null,
  p_push_enabled boolean default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  update public.privacy_settings
    set show_gifted_total = coalesce(p_show_gifted_total, show_gifted_total),
        show_received_total = coalesce(p_show_received_total, show_received_total),
        on_gifted_board = coalesce(p_on_gifted_board, on_gifted_board),
        on_received_board = coalesce(p_on_received_board, on_received_board),
        share_activity = coalesce(p_share_activity, share_activity),
        push_enabled = coalesce(p_push_enabled, push_enabled)
    where user_id = uid;
end $$;

create function public.register_push_token(p_expo_push_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  insert into public.push_tokens (user_id, expo_push_token, platform)
    values (uid, p_expo_push_token, p_platform)
    on conflict (expo_push_token) do update set user_id = excluded.user_id, platform = excluded.platform;
end $$;

create function public.mark_notifications_read(p_notification_ids uuid[] default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  update public.notifications
    set read_at = now()
    where user_id = uid and read_at is null
      and (p_notification_ids is null or id = any (p_notification_ids));
end $$;

-- Grants

revoke execute on all functions in schema public, private from public, anon;
-- Other people's profiles expose only these columns. Your own full profile comes from an RPC.
grant select (id, username, display_name, bio, avatar_path) on public.profiles to authenticated;
grant select on public.privacy_settings, public.push_tokens, public.blocks, public.notifications to authenticated;

grant execute on function
  private.is_blocked(uuid, uuid),
  private.require_user(),
  private.like_escape(text),
  public.complete_onboarding(text, text, public.user_intent, boolean, text),
  public.update_profile(text, text, text, text),
  public.update_privacy(boolean, boolean, boolean, boolean, boolean, boolean),
  public.register_push_token(text, text),
  public.mark_notifications_read(uuid[])
to authenticated;
