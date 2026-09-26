-- ============================================================================
-- SURGICAL FIX: "infinite recursion detected in policy for relation
-- business_members"
--
-- Paste ONLY this file into Supabase → SQL Editor and press Run.
-- It touches just ONE table and the helper function, so nothing in it can
-- fail because of a missing table. Safe to run as many times as you like.
-- ============================================================================

-- 1. Delete EVERY policy on business_members, whatever its name and origin
do $$
declare p text;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'business_members'
  loop
    execute format('drop policy if exists %I on public.business_members', p);
  end loop;
end $$;

-- 2. Make sure RLS is not FORCED on this table (forced RLS applies even
--    inside security definer functions and creates the loop)
alter table public.business_members no force row level security;

-- 3. Recreate a minimal, recursion-proof policy set:
--    every rule looks at ONLY the row being checked — never back at the table.
create policy bm_select_self on public.business_members
  for select to authenticated
  using (auth.uid() = user_id);

create policy bm_insert_self on public.business_members
  for insert to authenticated
  with check (auth.uid() = user_id and role in ('OWNER', 'STAFF', 'MANAGER'));

create policy bm_update_self on public.business_members
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Rebuild the helper OTHER tables rely on, guaranteeing it really runs as
--    its owner (security definer) so it bypasses RLS instead of looping
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

alter function public.is_active_member(uuid) security definer;
alter function public.is_active_member(uuid) owner to postgres;

revoke all on function public.is_active_member(uuid) from public, anon;
grant execute on function public.is_active_member(uuid) to authenticated;

-- 5. PROOF — the Results panel must show EXACTLY these 3 rows and nothing else:
--    bm_insert_self / bm_select_self / bm_update_self
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'business_members'
order by policyname;
