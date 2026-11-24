-- =====================================================================
-- Head office can delete one of its branches (with everything in it:
-- appointments, customers, services, hours, branch staff, team access).
-- The app asks for the password first (checked by the server).
-- Head-office drivers are NOT deleted: they belong to the head office.
-- Safe to run more than once.
-- =====================================================================

create or replace function public.delete_branch(p_branch_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  b businesses%rowtype;
  n_appointments int;
  n_customers int;
begin
  select * into b from businesses where id = p_branch_id;
  if b.id is null then
    raise exception 'Branch not found.' using errcode = 'P0002';
  end if;
  if b.parent_business_id is null then
    raise exception 'Only a branch can be deleted here.' using errcode = '42501';
  end if;
  -- a direct member of the head office (branch people cannot delete their branch)
  if not exists (
    select 1 from business_members bm
    where bm.business_id = b.parent_business_id
      and bm.user_id = auth.uid()
      and upper(bm.status::text) = 'ACTIVE'
  ) then
    raise exception 'Only the head office can delete a branch.' using errcode = '42501';
  end if;

  select count(*) into n_appointments from appointments where business_id = b.id;
  select count(*) into n_customers from customers where business_id = b.id;

  -- appointments first (they point at the branch's services)
  delete from appointments where business_id = b.id;
  delete from businesses where id = b.id;

  insert into audit_logs (business_id, user_id, action, entity_type, entity_id)
  values (b.parent_business_id, auth.uid(), 'delete_branch', 'business', b.id);

  return jsonb_build_object('id', b.id, 'name', b.name, 'appointments', n_appointments, 'customers', n_customers);
end;
$$;

revoke all on function public.delete_branch(uuid) from public, anon;
grant execute on function public.delete_branch(uuid) to authenticated;
