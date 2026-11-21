-- =====================================================================
-- Branches: a business can have branches (one level). Members of the head
-- office can see and manage their branches; branch members see only their
-- own branch. Safe to run more than once.
-- =====================================================================

alter table public.businesses
  add column if not exists parent_business_id uuid references public.businesses(id) on delete restrict;
create index if not exists businesses_parent_business_id_idx on public.businesses(parent_business_id);

-- Every RLS policy uses this: member of the business itself, OR member of its head office.
create or replace function public.is_active_member(business_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from business_members bm
    where bm.business_id = is_active_member.business_id
      and bm.user_id = auth.uid()
      and upper(bm.status::text) = 'ACTIVE'
  ) or exists (
    select 1
    from businesses b
    join business_members bm on bm.business_id = b.parent_business_id
    where b.id = is_active_member.business_id
      and bm.user_id = auth.uid()
      and upper(bm.status::text) = 'ACTIVE'
  );
$$;

-- Only a direct member of a head office may create a branch under it; a branch
-- cannot have branches; the link cannot be changed later (except platform admin).
create or replace function public.guard_business_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.parent_business_id is not null then
      if not exists (
        select 1 from business_members bm
        where bm.business_id = new.parent_business_id
          and bm.user_id = auth.uid()
          and upper(bm.status::text) = 'ACTIVE'
      ) then
        raise exception 'Only the head office can add a branch.' using errcode = '42501';
      end if;
      if exists (select 1 from businesses p where p.id = new.parent_business_id and p.parent_business_id is not null) then
        raise exception 'A branch cannot have its own branches.' using errcode = '42501';
      end if;
    end if;
  elsif new.parent_business_id is distinct from old.parent_business_id then
    raise exception 'The head office of a branch cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_guard_parent on public.businesses;
create trigger businesses_guard_parent
  before insert or update on public.businesses
  for each row execute function public.guard_business_parent();
