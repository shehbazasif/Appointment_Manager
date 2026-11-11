-- Business language: the dashboard and the public booking page are shown in
-- this language by default (en, el, ar, fr, it). Safe to run more than once.
-- Run in Supabase > SQL Editor.

alter table public.business_settings
  add column if not exists language text not null default 'en';

alter table public.business_settings drop constraint if exists valid_language;
alter table public.business_settings
  add constraint valid_language check (language in ('en', 'el', 'ar', 'fr', 'it'));

-- Public booking page reads its flags through this function.
create or replace function public.public_business_flags(p_business_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'onLocationEnabled', coalesce(bool_or(on_location_enabled), false),
    'hidePricesInList', coalesce(bool_or(hide_prices_in_list), false),
    'language', coalesce(max(language), 'en')
  )
  from business_settings where business_id = p_business_id;
$$;
revoke all on function public.public_business_flags(uuid) from public;
grant execute on function public.public_business_flags(uuid) to anon, authenticated;
