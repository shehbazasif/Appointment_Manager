-- =====================================================================
-- Drivers (staff) belong to the head office and are shared by its branches.
--  * Branch people can SEE the head office's staff (to assign a driver).
--    They cannot change them: only head-office people can.
--  * An appointment may only use staff of its own business or of its head
--    office.
--  * One driver, one job at a time: a staff member cannot have two
--    overlapping (not cancelled) appointments, across the head office and
--    all branches.
-- Safe to run more than once.
-- =====================================================================

-- read-only access to the head office's staff for members of its branches
drop policy if exists staff_branch_read on public.staff;
create policy staff_branch_read on public.staff
  for select to authenticated
  using (
    exists (
      select 1
      from businesses b
      join business_members bm on bm.business_id = b.id
      where b.parent_business_id = staff.business_id
        and bm.user_id = auth.uid()
        and upper(bm.status::text) = 'ACTIVE'
    )
  );

create or replace function public.guard_staff_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.staff_id is null or lower(new.status::text) in ('cancelled', 'no_show') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.staff_id is not distinct from old.staff_id
     and new.start_at = old.start_at
     and new.end_at = old.end_at
     and lower(new.status::text) = lower(old.status::text) then
    return new;
  end if;

  if not exists (
    select 1
    from staff s
    join businesses b on b.id = new.business_id
    where s.id = new.staff_id
      and (s.business_id = b.id or s.business_id = b.parent_business_id)
  ) then
    raise exception 'This staff member does not work for this business.' using errcode = '42501';
  end if;

  -- one job at a time, wherever it is booked
  perform pg_advisory_xact_lock(hashtext('staff-busy:' || new.staff_id::text));
  if exists (
    select 1 from appointments a
    where a.staff_id = new.staff_id
      and a.id <> new.id
      and lower(a.status::text) not in ('cancelled', 'no_show')
      and a.start_at < new.end_at
      and a.end_at > new.start_at
  ) then
    raise exception 'STAFF_BUSY: This staff member already has another appointment at this time.' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_staff_assignment on public.appointments;
create trigger guard_staff_assignment
  before insert or update of staff_id, start_at, end_at, status on public.appointments
  for each row execute function public.guard_staff_assignment();
