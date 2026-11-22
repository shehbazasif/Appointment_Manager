-- =====================================================================
-- "Branches" is a feature the platform admin turns on per business.
-- Unlike the other features it is OFF unless the admin switched it on
-- (features_allowed.branches = true).
--  * The admin panel can save the new "branches" key.
--  * A branch can only be added under a head office that has the feature.
--  * Lee Lee Pets already has branches: the feature is switched on for it.
-- Safe to run more than once.
-- =====================================================================

create or replace function public.branches_allowed(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select (features_allowed ->> 'branches')::boolean from business_settings where business_id = p_business_id), false);
$$;
revoke all on function public.branches_allowed(uuid) from public, anon;
grant execute on function public.branches_allowed(uuid) to authenticated;

-- admin panel: accept the "branches" key too
create or replace function public.admin_update_business(p_business_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
          where k in ('tokens', 'onLocation', 'attendance', 'import', 'theme', 'branches')
            and jsonb_typeof(v) = 'boolean')
      else features_allowed end,
    updated_at = now()
  where business_id = p_business_id;

  return public.admin_business_detail(p_business_id);
end;
$function$;

-- adding a branch needs the feature on the head office
create or replace function public.guard_business_parent()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.is_platform_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.parent_business_id is not null then
      if not exists (select 1 from business_members bm where bm.business_id = new.parent_business_id and bm.user_id = auth.uid() and upper(bm.status::text) = 'ACTIVE') then
        raise exception 'Only the head office can add a branch.' using errcode = '42501';
      end if;
      if exists (select 1 from businesses p where p.id = new.parent_business_id and p.parent_business_id is not null) then
        raise exception 'A branch cannot have its own branches.' using errcode = '42501';
      end if;
      if not public.branches_allowed(new.parent_business_id) then
        raise exception 'Branches are not switched on for this business.' using errcode = '42501';
      end if;
    end if;
  elsif new.parent_business_id is distinct from old.parent_business_id then
    raise exception 'The head office of a branch cannot be changed.' using errcode = '42501';
  end if;
  return new;
end; $function$;

-- businesses that already have branches keep them (Lee Lee Pets)
alter table public.business_settings disable trigger business_settings_guard_features;
update public.business_settings s
   set features_allowed = coalesce(s.features_allowed, '{}'::jsonb) || '{"branches": true}'::jsonb
 where exists (select 1 from public.businesses c where c.parent_business_id = s.business_id)
   and coalesce((s.features_allowed ->> 'branches')::boolean, false) = false;
alter table public.business_settings enable trigger business_settings_guard_features;
