-- Service categories + per-service currency on the public booking page.
-- Safe to run more than once. Run in Supabase > SQL Editor.

-- 1) Each service belongs to a category (default "General")
alter table public.services
  add column if not exists category text not null default 'General';

-- 2) Category names the business created (so empty categories are kept)
alter table public.business_settings
  add column if not exists service_categories text[] not null default '{}';

-- 3) Public booking page: also return the category (return type changes,
--    so the function is dropped and created again, then re-granted)
drop function if exists public.public_services_for_business(uuid);
create function public.public_services_for_business(p_business_id uuid)
returns table (
  id uuid, name text, description text,
  duration_minutes integer, price numeric, currency text, status text, category text
)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.name, s.description, s.duration_minutes, s.price, s.currency, s.status,
         coalesce(nullif(s.category, ''), 'General')
  from services s
  where s.business_id = p_business_id and s.status = 'ACTIVE';
$$;
revoke all on function public.public_services_for_business(uuid) from anon, authenticated;
grant execute on function public.public_services_for_business(uuid) to anon, authenticated;
