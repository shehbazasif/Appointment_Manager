-- Booking page option: show the queue token to the customer after booking
-- (a ticket they can screenshot, with a note to arrive 20-25 minutes early).
-- Safe to run more than once. Run in Supabase > SQL Editor.

alter table public.business_settings
  add column if not exists show_token_to_customer boolean not null default false;

create or replace function public.public_business_flags(p_business_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'onLocationEnabled', coalesce(bool_or(on_location_enabled), false),
    'hidePricesInList', coalesce(bool_or(hide_prices_in_list), false),
    'language', coalesce(max(language), 'en'),
    'themeColor', max(theme_color),
    'showTokenToCustomer', coalesce(bool_or(show_token_to_customer), false)
  )
  from business_settings where business_id = p_business_id;
$$;
revoke all on function public.public_business_flags(uuid) from public;
grant execute on function public.public_business_flags(uuid) to anon, authenticated;
