-- =====================================================================
-- On-location service mode (car towing, dog cleaning, home visits ...)
-- Run AFTER staff-features.sql. Safe to run more than once.
-- =====================================================================
alter table business_settings add column if not exists on_location_enabled boolean not null default false;

alter table appointments add column if not exists location_lat double precision;
alter table appointments add column if not exists location_lng double precision;
alter table appointments add column if not exists location_accuracy_m double precision;
alter table appointments add column if not exists location_note text;
alter table appointments add column if not exists location_captured_at timestamptz;
alter table appointments add column if not exists field_status text;
do $$ begin
  alter table appointments add constraint appointments_field_status_chk
    check (field_status is null or field_status in ('ASSIGNED','ON_THE_WAY','ON_LOCATION'));
exception when duplicate_object then null; end $$;

create or replace function public.public_business_flags(p_business_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('onLocationEnabled', coalesce(bool_or(on_location_enabled), false))
  from business_settings where business_id = p_business_id;
$$;
revoke all on function public.public_business_flags(uuid) from public;
grant execute on function public.public_business_flags(uuid) to anon, authenticated;

drop function if exists public.public_book_appointment(text, uuid, timestamptz, timestamptz, text, text, text, text, text);

create or replace function public.public_book_appointment(
  p_business_slug text, p_service_id uuid, p_start_at timestamptz, p_end_at timestamptz,
  p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text default null,
  p_lat double precision default null, p_lng double precision default null,
  p_accuracy double precision default null, p_location_note text default null
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
  v_onloc boolean;
begin
  select * into v_business from businesses where slug = p_business_slug;
  if not found or coalesce(to_jsonb(v_business) ->> 'status', 'ACTIVE') <> 'ACTIVE' then
    raise exception 'Booking page not found or inactive.';
  end if;
  select * into v_settings from business_settings bs where bs.business_id = v_business.id;
  if not found or coalesce(v_settings.online_booking_enabled, false) = false then
    raise exception 'Booking page not found or inactive.';
  end if;
  v_onloc := coalesce(v_settings.on_location_enabled, false);
  if v_onloc then
    if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'Please share your current location to book this service.';
    end if;
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
    -- on-location businesses: the manager assigns staff later
    if not v_onloc then v_staff_id := v_free[1]; end if;
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
    business_id, customer_id, staff_id, service_id, start_at, end_at, status, booking_source, notes,
    location_lat, location_lng, location_accuracy_m, location_note, location_captured_at
  ) values (
    v_business.id, v_customer_id, v_staff_id, v_service.id, p_start_at, p_end_at, 'CONFIRMED', 'ONLINE', p_notes,
    case when v_onloc then p_lat end, case when v_onloc then p_lng end, case when v_onloc then p_accuracy end,
    case when v_onloc then nullif(trim(p_location_note), '') end, case when v_onloc then now() end
  ) returning id into v_appointment_id;

  insert into appointment_history (business_id, appointment_id, action, new_status)
  values (v_business.id, v_appointment_id, 'CREATED', 'CONFIRMED');

  return v_appointment_id;
end;
$$;


revoke all on function public.public_book_appointment(text, uuid, timestamptz, timestamptz, text, text, text, text, text, double precision, double precision, double precision, text) from public, anon, authenticated;
grant execute on function public.public_book_appointment(text, uuid, timestamptz, timestamptz, text, text, text, text, text, double precision, double precision, double precision, text) to anon, authenticated;
