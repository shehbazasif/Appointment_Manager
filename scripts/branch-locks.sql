-- =====================================================================
-- Branches are part of the head office, not separate businesses.
--  * Only head-office people manage the team (of the head office and of
--    every branch). Branch people cannot invite, see or remove anyone.
--  * Branch people cannot change the business profile (name, logo,
--    contact details), the business type or the booking-page switches;
--    those follow the head office.
--  * The invite page can tell whether the invited email already has an
--    account (so it shows "sign in" instead of "create account").
-- Safe to run more than once.
-- =====================================================================

-- Head-office member for this business: a direct member of it when it is a
-- head office (no parent), or a member of its head office when it is a branch.
create or replace function public.is_head_office_member(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from businesses target
    join businesses head on head.id = coalesce(target.parent_business_id, target.id)
    join business_members bm on bm.business_id = head.id
    where target.id = p_business_id
      and head.parent_business_id is null
      and bm.user_id = auth.uid()
      and upper(bm.status::text) = 'ACTIVE'
  );
$$;
revoke all on function public.is_head_office_member(uuid) from public, anon;
grant execute on function public.is_head_office_member(uuid) to authenticated;

-- Invitations: head office only
drop policy if exists invitations_member_all on public.business_invitations;
drop policy if exists invitations_head_office_all on public.business_invitations;
create policy invitations_head_office_all on public.business_invitations
  for all to authenticated
  using (public.is_head_office_member(business_id))
  with check (public.is_head_office_member(business_id));

-- Team list: head office only
create or replace function public.business_team(p_business_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_head_office_member(p_business_id) then
    raise exception 'Only the head office manages the team.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', bm.user_id, 'role', upper(bm.role::text), 'status', upper(bm.status::text),
        'email', u.email, 'name', trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
        'lastSignInAt', u.last_sign_in_at, 'isYou', bm.user_id = auth.uid()) order by bm.created_at)
      from business_members bm
      left join auth.users u on u.id = bm.user_id
      left join profiles p on p.id = bm.user_id
      where bm.business_id = p_business_id and upper(bm.status::text) = 'ACTIVE'
    ), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'email', i.email, 'role', upper(i.role), 'createdAt', i.created_at, 'expiresAt', i.expires_at) order by i.created_at desc)
      from business_invitations i
      where i.business_id = p_business_id and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    ), '[]'::jsonb)
  );
end;
$$;

-- Remove someone: head office only
create or replace function public.remove_business_member(p_business_id uuid, p_user_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if not public.is_head_office_member(p_business_id) then
    raise exception 'Only the head office manages the team.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself.' using errcode = '42501';
  end if;
  if exists (select 1 from business_members where business_id = p_business_id and user_id = p_user_id and upper(role::text) = 'OWNER') then
    raise exception 'The owner cannot be removed.' using errcode = '42501';
  end if;
  delete from business_members where business_id = p_business_id and user_id = p_user_id;
end;
$$;

-- Invite page: also says whether the invited email already has an account
create or replace function public.invitation_preview(p_token_hash text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'businessName', b.name,
    'email', i.email,
    'valid', i.revoked_at is null and (i.accepted_at is not null or i.expires_at > now()),
    'accepted', i.accepted_at is not null,
    'hasAccount', exists (select 1 from auth.users u where lower(u.email) = lower(i.email))
  )
  from business_invitations i join businesses b on b.id = i.business_id
  where i.token_hash = p_token_hash;
$$;

-- Branch profile is locked for branch people (head office may still change it)
create or replace function public.guard_branch_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.parent_business_id is null or public.is_platform_admin() or public.is_head_office_member(new.id) then
    return new;
  end if;
  if new.name is distinct from old.name
     or new.slug is distinct from old.slug
     or new.logo_url is distinct from old.logo_url
     or new.description is distinct from old.description
     or new.email is distinct from old.email
     or new.phone is distinct from old.phone then
    raise exception 'The business profile is managed by the head office.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_branch_profile on public.businesses;
create trigger guard_branch_profile before update on public.businesses
  for each row execute function public.guard_branch_profile();

-- Booking-page switches and business type are locked for branch people
create or replace function public.guard_branch_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_platform_admin()
     or public.is_head_office_member(new.business_id)
     or not exists (select 1 from businesses where id = new.business_id and parent_business_id is not null) then
    return new;
  end if;
  if new.online_booking_enabled is distinct from old.online_booking_enabled
     or new.on_location_enabled is distinct from old.on_location_enabled
     or new.hide_prices_in_list is distinct from old.hide_prices_in_list
     or new.show_token_to_customer is distinct from old.show_token_to_customer
     or new.tokens_enabled is distinct from old.tokens_enabled
     or new.business_type is distinct from old.business_type then
    raise exception 'These settings are managed by the head office.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_branch_settings on public.business_settings;
create trigger guard_branch_settings before update on public.business_settings
  for each row execute function public.guard_branch_settings();
