-- Discover search.

create function private.my_location() returns text
language sql stable security definer set search_path = '' as $$
  select pr.general_location from public.profiles pr where pr.id = auth.uid();
$$;

-- Keyset pagination: pass the last row's sort_value and id to get the next page.
create function public.search_posts(
  p_query text default null,
  p_category text default null,
  p_max_remaining_cents integer default null,
  p_location text default null,
  p_sort text default 'newest',
  p_cursor_value numeric default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  receiver_id uuid,
  receiver_first_name text,
  title text,
  category text,
  goal_cents integer,
  raised_cents integer,
  general_location text,
  cover_photo_path text,
  created_at timestamptz,
  sort_value numeric
)
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := private.require_user();
  near text := lower(private.my_location());
begin
  if p_sort not in ('newest', 'closest_to_goal', 'nearby') then
    raise exception 'invalid_sort' using errcode = '22023';
  end if;
  return query
    select * from (
      select p.id, p.receiver_id, split_part(pr.display_name, ' ', 1), p.title, p.category,
             p.goal_cents, p.raised_cents, p.general_location,
             (select ph.storage_path from public.post_photos ph where ph.post_id = p.id order by ph.position limit 1),
             p.created_at,
             case p_sort
               when 'closest_to_goal' then p.raised_cents::numeric / p.goal_cents
               when 'nearby' then (case when lower(p.general_location) = near then 1000000000000 else 0 end)
                 + extract(epoch from p.created_at)
               else extract(epoch from p.created_at)
             end as sort_value
      from public.posts p
      join public.profiles pr on pr.id = p.receiver_id
      where p.status = 'open'
        and p.receiver_id <> uid
        and (p_query is null or p.search @@ websearch_to_tsquery('english', p_query))
        and (p_category is null or p.category = p_category)
        and (p_max_remaining_cents is null or p.goal_cents - p.raised_cents <= p_max_remaining_cents)
        and (p_location is null or p.general_location ilike '%' || private.like_escape(p_location) || '%')
    ) r
    where p_cursor_value is null or (r.sort_value, r.id) < (p_cursor_value, p_cursor_id)
    order by r.sort_value desc, r.id desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- Grants

revoke execute on all functions in schema public, private from public, anon;
grant execute on function
  private.my_location(),
  public.search_posts(text, text, integer, text, text, numeric, uuid, integer)
to authenticated;
