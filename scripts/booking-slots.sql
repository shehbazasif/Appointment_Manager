-- Booking slot timing per business. Safe to run more than once.
-- slot_step_minutes: how often a new start time is offered (default 30 = old behaviour)
-- buffer_minutes:    free time kept after each booking (default 0 = old behaviour)
-- Run in Supabase > SQL Editor.

alter table public.business_settings
  add column if not exists slot_step_minutes integer not null default 30;
alter table public.business_settings
  add column if not exists buffer_minutes integer not null default 0;

alter table public.business_settings drop constraint if exists valid_slot_step;
alter table public.business_settings
  add constraint valid_slot_step check (slot_step_minutes between 5 and 240);
alter table public.business_settings drop constraint if exists valid_buffer;
alter table public.business_settings
  add constraint valid_buffer check (buffer_minutes between 0 and 120);

create or replace function public.public_business_flags(p_business_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'onLocationEnabled', coalesce(bool_or(on_location_enabled), false),
    'hidePricesInList', coalesce(bool_or(hide_prices_in_list), false),
    'language', coalesce(max(language), 'en'),
    'themeColor', max(theme_color),
    'showTokenToCustomer', coalesce(bool_or(show_token_to_customer), false),
    'slotStepMinutes', coalesce(max(slot_step_minutes), 30),
    'bufferMinutes', coalesce(max(buffer_minutes), 0)
  )
  from business_settings where business_id = p_business_id;
$$;
revoke all on function public.public_business_flags(uuid) from public;
grant execute on function public.public_business_flags(uuid) to anon, authenticated;
