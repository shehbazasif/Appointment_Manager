-- Fix: "new row for relation businesses violates check constraint valid_timezone"
-- The old rule only allowed ~15 European time zones (Asia/Qatar, Asia/Karachi ...
-- were rejected). This replaces it with a rule that accepts any real IANA zone.
-- Safe to run more than once. Run in Supabase > SQL Editor.

create or replace function public.is_valid_timezone(tz text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
begin
  perform now() at time zone tz;
  return true;
exception when others then
  return false;
end;
$$;

alter table public.businesses drop constraint if exists valid_timezone;
alter table public.businesses
  add constraint valid_timezone check (timezone is null or public.is_valid_timezone(timezone));

-- Booking page option: hide prices on the first (service list) page;
-- the price is shown only after the customer picks a service.
alter table public.business_settings
  add column if not exists hide_prices_in_list boolean not null default false;

create or replace function public.public_business_flags(p_business_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'onLocationEnabled', coalesce(bool_or(on_location_enabled), false),
    'hidePricesInList', coalesce(bool_or(hide_prices_in_list), false)
  )
  from business_settings where business_id = p_business_id;
$$;
revoke all on function public.public_business_flags(uuid) from public;
grant execute on function public.public_business_flags(uuid) to anon, authenticated;
