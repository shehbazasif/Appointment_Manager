-- ============================================================================
-- ReventouOS: staff duty schedule, QR attendance, capacity-aware online booking
-- Run ONCE in Supabase > SQL Editor. Safe to run again (idempotent).
-- ============================================================================

-- 0) Email is optional on the booking form, so customers.email may be empty
alter table public.customers alter column email drop not null;

-- 1) Staff duty schedule (one row per staff member per weekday; 0 = Sunday)
create table if not exists public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  is_off boolean not null default false,
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  unique (staff_id, day_of_week)
);

-- 2) Attendance (QR check-in / check-out)
create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  method text not null default 'QR'
);
create index if not exists staff_attendance_biz_in_idx on public.staff_attendance (business_id, check_in_at desc);
create index if not exists staff_attendance_staff_in_idx on public.staff_attendance (staff_id, check_in_at desc);

alter table public.staff_schedules enable row level security;
alter table public.staff_attendance enable row level security;

drop policy if exists staff_schedules_member_all on public.staff_schedules;
create policy staff_schedules_member_all on public.staff_schedules
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

drop policy if exists staff_attendance_member_all on public.staff_attendance;
create policy staff_attendance_member_all on public.staff_attendance
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

-- 3) Public (no login) read helpers used by the customer booking page
create or replace function public.public_staff_for_business(p_business_id uuid)
returns table (id uuid, service_ids uuid[])
language sql security definer set search_path = public stable as $$
  select s.id,
         coalesce(array(select ss.service_id from staff_services ss where ss.staff_id = s.id), '{}'::uuid[])
  from staff s
  where s.business_id = p_business_id and s.status = 'ACTIVE'
    and exists (select 1 from business_settings bs where bs.business_id = p_business_id and bs.online_booking_enabled = true);
$$;

create or replace function public.public_staff_schedules(p_business_id uuid)
returns table (staff_id uuid, day_of_week int, is_off boolean, start_time time, end_time time)
language sql security definer set search_path = public stable as $$
  select sc.staff_id, sc.day_of_week, sc.is_off, sc.start_time, sc.end_time
  from staff_schedules sc
  where sc.business_id = p_business_id
    and exists (select 1 from business_settings bs where bs.business_id = p_business_id and bs.online_booking_enabled = true);
$$;

create or replace function public.public_day_appointments_v2(
  p_business_id uuid, p_day_start timestamptz, p_day_end timestamptz
)
returns table (start_at timestamptz, end_at timestamptz, status text, staff_id uuid)
language sql security definer set search_path = public stable as $$
  select a.start_at, a.end_at, a.status, a.staff_id
  from appointments a
  where a.business_id = p_business_id
    and exists (select 1 from business_settings bs where bs.business_id = p_business_id and bs.online_booking_enabled = true)
    and a.end_at > p_day_start and a.start_at < p_day_end;
$$;

create or replace function public.public_business_timezone(p_business_id uuid)
returns text
language sql security definer set search_path = public stable as $$
  select coalesce((select nullif(bs.timezone, '') from business_settings bs where bs.business_id = p_business_id), 'Europe/Athens');
$$;
revoke all on function public.public_business_timezone(uuid) from anon, authenticated;
grant execute on function public.public_business_timezone(uuid) to anon, authenticated;

revoke all on function public.public_staff_for_business(uuid) from anon, authenticated;
grant execute on function public.public_staff_for_business(uuid) to anon, authenticated;
revoke all on function public.public_staff_schedules(uuid) from anon, authenticated;
grant execute on function public.public_staff_schedules(uuid) to anon, authenticated;
revoke all on function public.public_day_appointments_v2(uuid, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.public_day_appointments_v2(uuid, timestamptz, timestamptz) to anon, authenticated;

-- 4) Online booking: a slot is bookable while at least one ACTIVE staff member is
--    on duty and free. The booking is assigned to that staff member automatically.
--    (Staff with no schedule follow business hours; a service linked to specific
--    staff is only given to those staff.)
create or replace function public.public_book_appointment(
  p_business_slug text, p_service_id uuid, p_start_at timestamptz, p_end_at timestamptz,
  p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_business businesses;
  v_settings business_settings;
  v_service services;
  v_customer_id uuid;
  v_email text;
  v_appointment_id uuid;
  v_staff_id uuid := null;
  v_tz text;
  v_hours business_hours;
  v_local_start timestamp;
  v_local_end timestamp;
  v_dow int;
  v_active_staff int;
  v_free uuid[];
  v_unassigned int;
begin
  select * into v_business from businesses where slug = p_business_slug;
  if not found or coalesce(to_jsonb(v_business) ->> 'status', 'ACTIVE') <> 'ACTIVE' then
    raise exception 'Booking page not found or inactive.';
  end if;
  select * into v_settings from business_settings bs where bs.business_id = v_business.id;
  if not found or coalesce(v_settings.online_booking_enabled, false) = false then
    raise exception 'Booking page not found or inactive.';
  end if;

  select * into v_service from services
    where id = p_service_id and business_id = v_business.id and status = 'ACTIVE';
  if not found then raise exception 'Service not found or inactive.'; end if;

  if p_start_at <= now() then raise exception 'Start time must be in the future.'; end if;
  if p_end_at <= p_start_at then raise exception 'End time must be after start time.'; end if;

  -- one booking at a time per business, so two customers cannot grab the last slot together
  perform pg_advisory_xact_lock(hashtext('book:' || v_business.id::text));

  -- the booking must be inside the business's opening hours (checked here too, not
  -- only on the booking page, so nobody can bypass it)
  v_tz := coalesce(nullif(v_settings.timezone, ''), nullif(to_jsonb(v_business) ->> 'timezone', ''), 'Europe/Athens');
  v_local_start := p_start_at at time zone v_tz;
  v_local_end := p_end_at at time zone v_tz;
  v_dow := extract(dow from v_local_start)::int;

  select * into v_hours from business_hours h
    where h.business_id = v_business.id and h.day_of_week = v_dow;
  if found then
    if v_hours.is_closed
       or v_local_end::date <> v_local_start::date
       or v_local_start::time < v_hours.start_time
       or v_local_end::time > v_hours.end_time then
      raise exception 'The business is closed at that time. Please choose a time within opening hours.';
    end if;
  elsif v_local_end::date <> v_local_start::date
        or v_local_start::time < time '09:00' or v_local_end::time > time '19:00' then
    raise exception 'The business is closed at that time. Please choose a time within opening hours.';
  end if;

  select count(*) into v_active_staff from staff
    where business_id = v_business.id and status = 'ACTIVE';

  if v_active_staff = 0 then
    -- no staff set up: the business is a single bookable resource
    if exists (
      select 1 from appointments a
      where a.business_id = v_business.id and a.status not in ('CANCELLED', 'NO_SHOW')
        and a.start_at < p_end_at and a.end_at > p_start_at
    ) then
      raise exception 'That time slot is no longer available. Please choose another time.';
    end if;
  else
    select count(*) into v_unassigned from appointments a
      where a.business_id = v_business.id and a.staff_id is null
        and a.status not in ('CANCELLED', 'NO_SHOW')
        and a.start_at < p_end_at and a.end_at > p_start_at;

    select array_agg(s.id order by s.id) into v_free
    from staff s
    where s.business_id = v_business.id and s.status = 'ACTIVE'
      and (not exists (select 1 from staff_services x where x.service_id = v_service.id)
           or exists (select 1 from staff_services x where x.service_id = v_service.id and x.staff_id = s.id))
      and (not exists (select 1 from staff_schedules sc where sc.staff_id = s.id)
           or exists (select 1 from staff_schedules sc
                      where sc.staff_id = s.id and sc.day_of_week = v_dow and not sc.is_off
                        and v_local_end::date = v_local_start::date
                        and sc.start_time <= v_local_start::time and sc.end_time >= v_local_end::time))
      and not exists (select 1 from appointments a
                      where a.staff_id = s.id and a.status not in ('CANCELLED', 'NO_SHOW')
                        and a.start_at < p_end_at and a.end_at > p_start_at);

    if coalesce(array_length(v_free, 1), 0) - v_unassigned <= 0 then
      raise exception 'That time slot is no longer available. Please choose another time.';
    end if;
    v_staff_id := v_free[1];
  end if;

  -- same customer = same email (when given) or same phone (when no email)
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  select c.id into v_customer_id from customers c
    where c.business_id = v_business.id
      and ((v_email is not null and c.email = v_email)
           or (v_email is null and c.phone = p_phone))
    limit 1;
  if v_customer_id is null then
    insert into customers (business_id, first_name, last_name, email, phone, notes)
    values (v_business.id, p_first_name, p_last_name, v_email, p_phone, p_notes)
    returning id into v_customer_id;
  end if;

  insert into appointments (
    business_id, customer_id, staff_id, service_id, start_at, end_at, status, booking_source, notes
  ) values (
    v_business.id, v_customer_id, v_staff_id, v_service.id, p_start_at, p_end_at, 'CONFIRMED', 'ONLINE', p_notes
  ) returning id into v_appointment_id;

  insert into appointment_history (business_id, appointment_id, action, new_status)
  values (v_business.id, v_appointment_id, 'CREATED', 'CONFIRMED');

  return v_appointment_id;
end;
$$;

revoke all on function public.public_book_appointment(text, uuid, timestamptz, timestamptz, text, text, text, text, text) from anon, authenticated;
grant execute on function public.public_book_appointment(text, uuid, timestamptz, timestamptz, text, text, text, text, text) to anon, authenticated;
