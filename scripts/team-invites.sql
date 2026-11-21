-- =====================================================================
-- Team invitations: managers invite people by email to their business or
-- one of its branches. Safe to run more than once.
-- =====================================================================

create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null default 'MANAGER' check (upper(role) in ('MANAGER', 'STAFF')),
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz
);
create index if not exists business_invitations_business_idx on public.business_invitations(business_id);

alter table public.business_invitations enable row level security;
drop policy if exists invitations_member_all on public.business_invitations;
create policy invitations_member_all on public.business_invitations
  for all to authenticated
  using (public.is_active_member(business_id))
  with check (public.is_active_member(business_id));

-- Accept: only the person the invite was sent to (same email as the login).
create or replace function public.accept_business_invitation(p_token_hash text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare inv business_invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into inv from business_invitations where token_hash = p_token_hash;
  if inv.id is null or inv.revoked_at is not null then
    raise exception 'This invitation is not valid any more.' using errcode = 'P0002';
  end if;
  if inv.accepted_at is null and inv.expires_at < now() then
    raise exception 'This invitation has expired. Ask for a new one.' using errcode = 'P0002';
  end if;
  if lower(inv.email) <> lower(coalesce(auth.email(), '')) then
    raise exception 'This invitation was sent to another email address. Sign in with %.', inv.email using errcode = '42501';
  end if;
  insert into business_members (business_id, user_id, role, status)
  values (inv.business_id, auth.uid(), upper(inv.role), 'ACTIVE')
  on conflict (business_id, user_id) do nothing;
  update business_invitations set accepted_at = coalesce(accepted_at, now()) where id = inv.id;
  return jsonb_build_object('businessId', inv.business_id,
    'businessName', (select name from businesses where id = inv.business_id));
end;
$$;

-- What the invite page shows before signing in (no personal data beyond a hint).
create or replace function public.invitation_preview(p_token_hash text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'businessName', b.name,
    'email', i.email,
    'valid', i.revoked_at is null and (i.accepted_at is not null or i.expires_at > now()),
    'accepted', i.accepted_at is not null
  )
  from business_invitations i join businesses b on b.id = i.business_id
  where i.token_hash = p_token_hash;
$$;

-- The team of a business (members + open invitations), for its members only.
create or replace function public.business_team(p_business_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_active_member(p_business_id) then
    raise exception 'Not allowed.' using errcode = '42501';
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
      select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'role', upper(i.role),
        'createdAt', i.created_at, 'expiresAt', i.expires_at) order by i.created_at desc)
      from business_invitations i
      where i.business_id = p_business_id and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    ), '[]'::jsonb)
  );
end;
$$;

-- Remove someone from a business (not yourself, not the owner).
create or replace function public.remove_business_member(p_business_id uuid, p_user_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if not public.is_active_member(p_business_id) then
    raise exception 'Not allowed.' using errcode = '42501';
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

revoke all on function public.accept_business_invitation(text) from public, anon;
revoke all on function public.business_team(uuid) from public, anon;
revoke all on function public.remove_business_member(uuid, uuid) from public, anon;
grant execute on function public.accept_business_invitation(text) to authenticated;
grant execute on function public.business_team(uuid) to authenticated;
grant execute on function public.remove_business_member(uuid, uuid) to authenticated;
grant execute on function public.invitation_preview(text) to anon, authenticated;
