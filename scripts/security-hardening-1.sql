-- =====================================================================
-- Security hardening, part 1 (urgent). Safe to run more than once.
--
-- 1. A member could UPDATE their own business_members row and point it at
--    ANOTHER business (RLS only checked user_id), gaining full access to
--    that business. Now only the platform admin may change business, user,
--    role or status of a membership. The app never changes these itself.
-- 2. Old SECURITY DEFINER functions that the app does not use were callable
--    by anyone (even logged out) through the REST API. Execute revoked.
-- =====================================================================

create or replace function public.guard_business_member_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_platform_admin() then
    return new;
  end if;
  if new.business_id is distinct from old.business_id
     or new.user_id is distinct from old.user_id
     or upper(new.role::text) is distinct from upper(old.role::text)
     or upper(new.status::text) is distinct from upper(old.status::text) then
    raise exception 'Membership changes are not allowed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists business_members_guard_update on public.business_members;
create trigger business_members_guard_update
  before update on public.business_members
  for each row execute function public.guard_business_member_update();

-- Unused legacy functions: nobody may call them through the API any more
revoke execute on function public.add_business_member(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.update_appointment_status(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.assign_staff_to_appointment(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.create_business(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
