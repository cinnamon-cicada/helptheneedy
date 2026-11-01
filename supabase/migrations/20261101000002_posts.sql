-- Posts, photos, gift instructions, and storage.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  story text not null check (char_length(story) between 1 and 5000),
  category text not null check (char_length(category) between 1 and 50),
  goal_cents integer not null check (goal_cents between 100 and 1000000),
  raised_cents integer not null default 0 check (raised_cents >= 0),
  general_location text check (char_length(general_location) <= 100),
  status public.post_status not null default 'draft',
  search tsvector generated always as (to_tsvector('english', title || ' ' || story)) stored,
  created_at timestamptz not null default now()
);
create index posts_receiver_id_idx on public.posts (receiver_id);
create index posts_open_created_at_idx on public.posts (created_at desc) where status = 'open';
create index posts_search_idx on public.posts using gin (search);

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

create table public.post_gift_instructions (
  post_id uuid primary key references public.posts (id) on delete cascade,
  instructions text not null check (char_length(instructions) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.post_photos enable row level security;
alter table public.post_gift_instructions enable row level security;

create policy posts_select_owner on public.posts for select to authenticated
  using (receiver_id = auth.uid());
create policy posts_select_open on public.posts for select to authenticated
  using (status = 'open' and not private.is_blocked(auth.uid(), receiver_id));
create policy post_photos_select on public.post_photos for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

-- Closes an open post. A trigger in the matching migration cancels its pending requests.
create function private.close_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.posts set status = 'closed' where id = p_post_id and status = 'open';
end $$;

create function private.owned_post(p_user uuid, p_post_id uuid) returns public.posts
language plpgsql security definer set search_path = '' as $$
declare
  post public.posts;
begin
  select * into post from public.posts p where p.id = p_post_id for update;
  if not found or post.receiver_id <> p_user then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  if post.status = 'removed' then
    raise exception 'post_removed' using errcode = '42501';
  end if;
  return post;
end $$;

create function public.create_post(
  p_title text,
  p_story text,
  p_category text,
  p_goal_cents integer,
  p_general_location text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  new_id uuid;
begin
  perform private.rate_limit(uid, 'create_post', 10, interval '1 day');
  insert into public.posts (receiver_id, title, story, category, goal_cents, general_location)
    values (uid, p_title, p_story, p_category, p_goal_cents, nullif(p_general_location, ''))
    returning id into new_id;
  return new_id;
end $$;

create function public.update_post(
  p_post_id uuid,
  p_title text default null,
  p_story text default null,
  p_category text default null,
  p_goal_cents integer default null,
  p_general_location text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  post public.posts := private.owned_post(private.require_user(), p_post_id);
begin
  if post.status = 'closed' then
    raise exception 'post_not_open' using errcode = '42501';
  end if;
  if p_goal_cents is not null and p_goal_cents <= post.raised_cents then
    raise exception 'goal_below_raised' using errcode = '22023';
  end if;
  update public.posts
    set title = coalesce(p_title, title),
        story = coalesce(p_story, story),
        category = coalesce(p_category, category),
        goal_cents = coalesce(p_goal_cents, goal_cents),
        general_location = case when p_general_location is null then general_location else nullif(p_general_location, '') end
    where id = p_post_id;
end $$;

create function public.add_post_photo(p_post_id uuid, p_storage_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  post public.posts := private.owned_post(uid, p_post_id);
  next_position integer;
  new_id uuid;
begin
  perform private.require_own_path(uid, p_storage_path);
  if (select count(*) from public.post_photos ph where ph.post_id = post.id) >= 5 then
    raise exception 'too_many_photos' using errcode = '22023';
  end if;
  select coalesce(max(ph.position), -1) + 1 into next_position from public.post_photos ph where ph.post_id = post.id;
  insert into public.post_photos (post_id, storage_path, position)
    values (post.id, p_storage_path, next_position)
    returning id into new_id;
  return new_id;
end $$;

-- Returns the storage path so the client can delete the file.
create function public.remove_post_photo(p_photo_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  photo public.post_photos;
begin
  select ph.* into photo from public.post_photos ph
    join public.posts p on p.id = ph.post_id
    where ph.id = p_photo_id and p.receiver_id = uid;
  if not found then
    raise exception 'photo_not_found' using errcode = 'P0002';
  end if;
  delete from public.post_photos where id = photo.id;
  return photo.storage_path;
end $$;

create function public.set_gift_instructions(p_post_id uuid, p_instructions text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  post public.posts := private.owned_post(private.require_user(), p_post_id);
begin
  insert into public.post_gift_instructions (post_id, instructions)
    values (post.id, p_instructions)
    on conflict (post_id) do update set instructions = excluded.instructions;
end $$;

create function public.publish_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  post public.posts := private.owned_post(private.require_user(), p_post_id);
begin
  if post.status = 'open' then
    return;
  end if;
  if post.status <> 'draft' then
    raise exception 'post_not_draft' using errcode = '42501';
  end if;
  if not exists (select 1 from public.post_gift_instructions i where i.post_id = post.id) then
    raise exception 'gift_instructions_required' using errcode = '22023';
  end if;
  update public.posts set status = 'open' where id = post.id;
end $$;

create function public.close_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  post public.posts := private.owned_post(private.require_user(), p_post_id);
begin
  perform private.close_post(post.id);
end $$;

-- Storage: one flat folder per user in each private bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('post-photos', 'post-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create policy storage_select on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'post-photos'));
create policy storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'post-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
    and array_length(storage.foldername(name), 1) = 1
  );
create policy storage_update on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'post-photos') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'post-photos') and (storage.foldername(name))[1] = auth.uid()::text);

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant select on public.posts, public.post_photos, public.post_gift_instructions to authenticated;

grant execute on function
  public.create_post(text, text, text, integer, text),
  public.update_post(uuid, text, text, text, integer, text),
  public.add_post_photo(uuid, text),
  public.remove_post_photo(uuid),
  public.set_gift_instructions(uuid, text),
  public.publish_post(uuid),
  public.close_post(uuid)
to authenticated;
