-- ============================================================================
-- RLS setup for RantevouOS — service-key-free architecture
-- ============================================================================
-- The app server talks to Supabase AS THE LOGGED-IN USER (their JWT), so the
-- database itself enforces "you can only touch your own business's data".
-- No service_role key is stored in the app.
--
-- Run this whole file in Supabase Dashboard → SQL Editor, then restart the
-- app. Safe to re-run (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. CLEAN SLATE — remove old policies from ANY previous setup (any name),
--    and un-force RLS (FORCED RLS applies even inside SECURITY DEFINER
--    functions and causes "infinite recursion detected in policy" loops).
--    Re-running this file is safe.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'profiles','businesses','business_members','business_settings',
    'business_hours','business_schedule_exceptions','services','staff',
    'staff_services','customers','appointments','appointment_history',
    'notifications','subscriptions'
  ]
  loop
    -- skip tables that don't exist in this project
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I no force row level security', t);
      for p in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = t
      loop
        execute format('drop policy if exists %I on public.%I', p, t);
      end loop;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Helper: is the current user an active member of business_id?
--    SECURITY DEFINER so it can read business_members under RLS without
--    recursive policy loops. Locked to a safe search_path.
-- ----------------------------------------------------------------------------
create or replace function public.is_active_member(business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from business_members bm
    where bm.business_id = is_active_member.business_id
      and bm.user_id = auth.uid()
      and bm.status = 'ACTIVE'
  );
$$;

-- only logged-in users may call the helper (policies need it; anon must not)
revoke all on function public.is_active_member(uuid) from public, anon;
grant execute on function public.is_active_member(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS on every tenant table (skips any table that doesn't exist)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','businesses','business_members','business_settings',
    'business_hours','business_schedule_exceptions','services','staff',
    'staff_services','customers','appointments','appointment_history',
    'notifications','subscriptions'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. profiles — users manage their own profile row only
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 4. businesses — create freely (signup), then members read/update their own
-- ----------------------------------------------------------------------------
drop policy if exists businesses_insert_authenticated on public.businesses;
create policy businesses_insert_authenticated on public.businesses
  for insert to authenticated
  with check (true);

drop policy if exists businesses_select_member on public.businesses;
create policy businesses_select_member on public.businesses
  for select to authenticated
  using (public.is_active_member(id));

drop policy if exists businesses_update_owner on public.businesses;
create policy businesses_update_owner on public.businesses
  for update to authenticated
  using (public.is_active_member(id))
  with check (public.is_active_member(id));

-- ----------------------------------------------------------------------------
-- 5. business_members — join yourself as OWNER, read/update own memberships.
--    Select is deliberately SELF-ONLY (no helper call on this table at all):
--    any policy here that looks at business_members again risks the exact
--    "infinite recursion" loop we just cleaned up. The definer helper is
--    only used from OTHER tables' policies.
--    (Bootstrap inserts the OWNER row with the user's own id; admin/invite
--    flows for adding staff accounts would need a SECURITY DEFINER function.)
-- ----------------------------------------------------------------------------
drop policy if exists business_members_select_own on public.business_members;
create policy business_members_select_own on public.business_members
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists business_members_insert_self on public.business_members;
create policy business_members_insert_self on public.business_members
  for insert to authenticated
  with check (auth.uid() = user_id and role in ('OWNER', 'STAFF', 'MANAGER'));

drop policy if exists business_members_update_own on public.business_members;
create policy business_members_update_own on public.business_members
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. Business-scoped tables — full member access via the helper
--    (business_settings, business_hours, business_schedule_exceptions,
--     services, staff, customers, appointments, appointment_history,
--     notifications, subscriptions)
-- ----------------------------------------------------------------------------
drop policy if exists business_settings_member_all on public.business_settings;
create policy business_settings_member_all on public.business_settings
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists business_hours_member_all on public.business_hours;
create policy business_hours_member_all on public.business_hours
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists business_schedule_exceptions_member_all on public.business_schedule_exceptions;
do $$ begin
  if to_regclass('public.business_schedule_exceptions') is not null then
    execute $pol$
      create policy business_schedule_exceptions_member_all on public.business_schedule_exceptions
      for all to authenticated
      using (public.is_active_member(business_id))
      with check (public.is_active_member(business_id))
    $pol$;
  end if;
end $$;

drop policy if exists services_member_all on public.services;
create policy services_member_all on public.services
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists staff_member_all on public.staff;
create policy staff_member_all on public.staff
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists staff_services_member_all on public.staff_services;
create policy staff_services_member_all on public.staff_services
  for all to authenticated
  using (
    exists (select 1 from staff s where s.id = staff_id and public.is_active_member(s.business_id))
  )
  with check (
    exists (select 1 from staff s where s.id = staff_id and public.is_active_member(s.business_id))
  );

drop policy if exists customers_member_all on public.customers;
create policy customers_member_all on public.customers
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists appointments_member_all on public.appointments;
create policy appointments_member_all on public.appointments
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists appointment_history_member_all on public.appointment_history;
create policy appointment_history_member_all on public.appointment_history
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists notifications_member_all on public.notifications;
create policy notifications_member_all on public.notifications
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists subscriptions_member_all on public.subscriptions;
do $$ begin
  if to_regclass('public.subscriptions') is not null then
    execute $pol$
      create policy subscriptions_member_all on public.subscriptions
      for all to authenticated
      using (public.is_active_member(business_id))
      with check (public.is_active_member(business_id))
    $pol$;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Public booking page support.
--    The booking page must show services/hours of a business WITHOUT login.
--    We expose narrow SECURITY DEFINER functions instead of opening the tables
--    to anon. The app calls them via .rpc().
-- ----------------------------------------------------------------------------
create or replace function public.public_business_by_slug(p_slug text)
returns table (
  id uuid, name text, slug text, description text, email text,
  phone text, city text, country text, timezone text, currency text,
  booking_active boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select b.id, b.name, b.slug, b.description, b.email,
         b.phone, b.city, b.country, b.timezone, b.currency,
         b.booking_active
  from businesses b
  where b.slug = p_slug and b.booking_active = true and b.status = 'ACTIVE';
$$;

create or replace function public.public_services_for_business(p_business_id uuid)
returns table (
  id uuid, name text, description text,
  duration_minutes integer, price numeric, currency text, status text
)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.name, s.description,
         s.duration_minutes, s.price, s.currency, s.status
  from services s
  where s.business_id = p_business_id and s.status = 'ACTIVE';
$$;

create or replace function public.public_hours_for_business(p_business_id uuid)
returns table (
  id uuid, business_id uuid, day_of_week int,
  start_time time, end_time time, is_closed boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select h.id, h.business_id, h.day_of_week,
         h.start_time, h.end_time, h.is_closed
  from business_hours h
  where h.business_id = p_business_id
  order by h.day_of_week;
$$;

-- Anon may call the three public functions only
revoke all on function public.public_business_by_slug(text) from anon, authenticated;
grant execute on function public.public_business_by_slug(text) to anon, authenticated;

revoke all on function public.public_services_for_business(uuid) from anon, authenticated;
grant execute on function public.public_services_for_business(uuid) to anon, authenticated;

revoke all on function public.public_hours_for_business(uuid) from anon, authenticated;
grant execute on function public.public_hours_for_business(uuid) to anon, authenticated;

-- Public booking creation: validates everything server-side, writes the
-- appointment + customer + history in one call. Returns the new appointment id.
create or replace function public.public_book_appointment(
  p_business_slug text,
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses;
  v_service services;
  v_customer customers;
  v_appointment_id uuid;
begin
  -- Business must exist and be live
  select * into v_business from businesses
    where slug = p_business_slug and booking_active = true and status = 'ACTIVE';
  if not found then
    raise exception 'Booking page not found or inactive.';
  end if;

  -- Service must belong to the business and be active
  select * into v_service from services
    where id = p_service_id and business_id = v_business.id and status = 'ACTIVE';
  if not found then
    raise exception 'Service not found or inactive.';
  end if;

  -- Basic sanity on times
  if p_start_at <= now() then
    raise exception 'Start time must be in the future.';
  end if;
  if p_end_at <= p_start_at then
    raise exception 'End time must be after start time.';
  end if;

  -- Find or create the customer (match by email within the business)
  select * into v_customer from customers
    where business_id = v_business.id and email = lower(p_email)
    limit 1;
  if not found then
    insert into customers (business_id, first_name, last_name, email, phone, notes)
    values (v_business.id, p_first_name, p_last_name, lower(p_email), p_phone, p_notes)
    returning * into v_customer;
  end if;

  -- Double-check overlap for unassigned bookings (staff_id is null)
  if exists (
    select 1 from appointments a
    where a.business_id = v_business.id
      and a.staff_id is null
      and a.status not in ('CANCELLED', 'NO_SHOW')
      and a.start_at < p_end_at
      and a.end_at > p_start_at
  ) then
    raise exception 'That time slot is no longer available. Please choose another time.';
  end if;

  insert into appointments (
    business_id, customer_id, staff_id, service_id,
    start_at, end_at, status, booking_source, notes
  ) values (
    v_business.id, v_customer.id, null, v_service.id,
    p_start_at, p_end_at, 'CONFIRMED', 'ONLINE', p_notes
  ) returning id into v_appointment_id;

  insert into appointment_history (business_id, appointment_id, action, new_status)
  values (v_business.id, v_appointment_id, 'CREATED', 'CONFIRMED');

  return v_appointment_id;
end;
$$;

revoke all on function public.public_book_appointment(
  text, uuid, timestamptz, timestamptz, text, text, text, text, text
) from anon, authenticated;
grant execute on function public.public_book_appointment(
  text, uuid, timestamptz, timestamptz, text, text, text, text, text
) to anon, authenticated;

-- Availability needs to read the day's appointments for a live business.
create or replace function public.public_day_appointments(
  p_business_id uuid,
  p_day_start timestamptz,
  p_day_end timestamptz
)
returns table (start_at timestamptz, end_at timestamptz, status text)
language sql
security definer
set search_path = public
stable
as $$
  select a.start_at, a.end_at, a.status
  from appointments a
  join businesses b on b.id = a.business_id
  where a.business_id = p_business_id
    and b.booking_active = true
    and a.end_at > p_day_start
    and a.start_at < p_day_end;
$$;

revoke all on function public.public_day_appointments(uuid, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.public_day_appointments(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Done. Final state check — the Results panel should list ONLY the policies
-- created above. If you see anything else on business_members, that's a leftover.
-- ----------------------------------------------------------------------------
select tablename as table, policyname as policy
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
