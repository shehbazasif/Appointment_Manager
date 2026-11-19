-- =====================================================================
-- Business type (template), Token system switch, admin feature
-- restrictions, and admin-only functions for the platform admin panel.
-- Safe to run more than once.
-- =====================================================================

-- 1. Platform admin = app_metadata.platform_role 'SUPER_ADMIN'
--    (app_metadata can only be changed by the project owner, never by the user)
create or replace function public.is_platform_admin()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'SUPER_ADMIN';
$$;

-- 2. New settings
alter table public.business_settings
  add column if not exists business_type text not null default 'general',
  add column if not exists tokens_enabled boolean not null default true,
  add column if not exists features_allowed jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.business_settings
    add constraint business_settings_business_type_check
    check (business_type in ('general', 'clinic', 'pet_grooming', 'salon', 'field_service'));
exception when duplicate_object then null; end $$;

-- 3. Only a platform admin may change features_allowed
create or replace function public.guard_features_allowed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_platform_admin() then
      new.features_allowed := '{}'::jsonb;
    end if;
  elsif new.features_allowed is distinct from old.features_allowed and not public.is_platform_admin() then
    raise exception 'Only the platform admin can change feature access.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists business_settings_guard_features on public.business_settings;
create trigger business_settings_guard_features
  before insert or update on public.business_settings
  for each row execute function public.guard_features_allowed();

-- 4. Booking page flags: tokens / on-location / theme respect admin access
create or replace function public.public_business_flags(p_business_id uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'onLocationEnabled', coalesce(bool_or(on_location_enabled and coalesce((features_allowed ->> 'onLocation')::boolean, true)), false),
    'hidePricesInList', coalesce(bool_or(hide_prices_in_list), false),
    'language', coalesce(max(language), 'en'),
    'themeColor', max(case when coalesce((features_allowed ->> 'theme')::boolean, true) then theme_color end),
    'showTokenToCustomer', coalesce(bool_or(show_token_to_customer and tokens_enabled and coalesce((features_allowed ->> 'tokens')::boolean, true)), false),
    'slotStepMinutes', coalesce(max(slot_step_minutes), 30),
    'bufferMinutes', coalesce(max(buffer_minutes), 0),
    'businessType', coalesce(max(business_type), 'general')
  )
  from business_settings where business_id = p_business_id;
$$;

-- 5. Admin functions (refuse anyone who is not a platform admin)
create or replace function public.admin_require()
returns void
language plpgsql stable
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Access restricted to platform administrators.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  perform public.admin_require();
  return jsonb_build_object(
    'totalOrganizations', (select count(*) from businesses),
    'activeOrganizations', (select count(*) from businesses where status = 'ACTIVE'),
    'totalAppointments', (select count(*) from appointments),
    'appointmentsLast30', (select count(*) from appointments where created_at > now() - interval '30 days'),
    'totalCustomers', (select count(*) from customers),
    'totalStaff', (select count(*) from staff)
  );
end;
$$;

create or replace function public.admin_list_businesses(p_search text default null)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare q text := nullif(trim(coalesce(p_search, '')), '');
begin
  perform public.admin_require();
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x."createdAt" desc)
    from (
      select
        b.id, b.name, b.slug, b.email, b.city, b.country, b.status,
        b.created_at as "createdAt",
        coalesce(s.business_type, 'general') as "businessType",
        coalesce(s.online_booking_enabled, false) as "bookingActive",
        coalesce(s.features_allowed, '{}'::jsonb) as "allowedFeatures",
        (select count(*) from appointments a where a.business_id = b.id) as "appointments",
        (select count(*) from appointments a where a.business_id = b.id and a.created_at > now() - interval '30 days') as "appointments30",
        (select count(*) from customers c where c.business_id = b.id) as "customers",
        (select count(*) from staff st where st.business_id = b.id) as "staff",
        (select max(a.created_at) from appointments a where a.business_id = b.id) as "lastBookingAt",
        (select u.email from business_members bm join auth.users u on u.id = bm.user_id
          where bm.business_id = b.id and bm.role = 'OWNER' order by bm.created_at limit 1) as "ownerEmail"
      from businesses b
      left join business_settings s on s.business_id = b.id
      where q is null
         or b.name ilike '%' || q || '%' or b.slug ilike '%' || q || '%'
         or b.email ilike '%' || q || '%' or coalesce(b.city, '') ilike '%' || q || '%'
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_business_detail(p_business_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare r jsonb;
begin
  perform public.admin_require();
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'slug', b.slug, 'email', b.email, 'phone', b.phone,
    'city', b.city, 'country', b.country, 'status', b.status, 'createdAt', b.created_at,
    'logoUrl', b.logo_url,
    'businessType', coalesce(s.business_type, 'general'),
    'bookingActive', coalesce(s.online_booking_enabled, false),
    'tokensEnabled', coalesce(s.tokens_enabled, true),
    'showTokenToCustomer', coalesce(s.show_token_to_customer, false),
    'onLocationEnabled', coalesce(s.on_location_enabled, false),
    'language', coalesce(s.language, 'en'),
    'timezone', coalesce(s.timezone, b.timezone),
    'allowedFeatures', coalesce(s.features_allowed, '{}'::jsonb),
    'counts', jsonb_build_object(
      'appointments', (select count(*) from appointments a where a.business_id = b.id),
      'appointments30', (select count(*) from appointments a where a.business_id = b.id and a.created_at > now() - interval '30 days'),
      'customers', (select count(*) from customers c where c.business_id = b.id),
      'staff', (select count(*) from staff st where st.business_id = b.id),
      'services', (select count(*) from services sv where sv.business_id = b.id)
    ),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', bm.role, 'status', bm.status, 'email', u.email,
        'name', trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
        'lastSignInAt', u.last_sign_in_at) order by bm.created_at)
      from business_members bm
      left join auth.users u on u.id = bm.user_id
      left join profiles p on p.id = bm.user_id
      where bm.business_id = b.id
    ), '[]'::jsonb),
    'recentAppointments', coalesce((
      select jsonb_agg(row_to_json(a)::jsonb) from (
        select ap.start_at as "startAt", ap.status, ap.booking_source as source,
               trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')) as "customer",
               sv.name as "service"
        from appointments ap
        left join customers c on c.id = ap.customer_id
        left join services sv on sv.id = ap.service_id
        where ap.business_id = b.id
        order by ap.created_at desc limit 8
      ) a
    ), '[]'::jsonb)
  ) into r
  from businesses b
  left join business_settings s on s.business_id = b.id
  where b.id = p_business_id;

  if r is null then
    raise exception 'Business not found.' using errcode = 'P0002';
  end if;
  return r;
end;
$$;

create or replace function public.admin_update_business(p_business_id uuid, p_patch jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
begin
  perform public.admin_require();

  if p_patch ? 'status' then
    if (p_patch ->> 'status') not in ('ACTIVE', 'INACTIVE') then
      raise exception 'Invalid status.';
    end if;
    update businesses set status = p_patch ->> 'status', updated_at = now() where id = p_business_id;
  end if;

  insert into business_settings (business_id) values (p_business_id)
  on conflict (business_id) do nothing;

  update business_settings set
    online_booking_enabled = case when p_patch ? 'bookingActive' then (p_patch ->> 'bookingActive')::boolean else online_booking_enabled end,
    business_type = case when p_patch ? 'businessType' then p_patch ->> 'businessType' else business_type end,
    features_allowed = case when p_patch ? 'allowedFeatures' then
        (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
           from jsonb_each(p_patch -> 'allowedFeatures') as e(k, v)
          where k in ('tokens', 'onLocation', 'attendance', 'import', 'theme')
            and jsonb_typeof(v) = 'boolean')
      else features_allowed end,
    updated_at = now()
  where business_id = p_business_id;

  return public.admin_business_detail(p_business_id);
end;
$$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_list_businesses(text) from public, anon;
revoke all on function public.admin_business_detail(uuid) from public, anon;
revoke all on function public.admin_update_business(uuid, jsonb) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_businesses(text) to authenticated;
grant execute on function public.admin_business_detail(uuid) to authenticated;
grant execute on function public.admin_update_business(uuid, jsonb) to authenticated;
