-- =====================================================================
-- Two-step login. Safe to run more than once.
-- 1. Platform admin powers need a session verified with the authenticator
--    app (Supabase MFA, JWT claim aal = 'aal2').
-- 2. Email login codes for business owners ("LOGIN" kind).
-- 3. Users can no longer reset the attempt counter of their own codes
--    (it could be used to keep guessing); attempts are counted by a
--    function that can only add +1.
-- =====================================================================

-- 1. admin = SUPER_ADMIN flag AND signed in with the authenticator app
create or replace function public.is_platform_admin()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'SUPER_ADMIN'
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- 2. login codes
alter table public.account_verification_codes drop constraint if exists account_verification_codes_kind_check;
alter table public.account_verification_codes
  add constraint account_verification_codes_kind_check
  check (kind = any (array['EMAIL_CHANGE'::text, 'PHONE_CHANGE'::text, 'LOGIN'::text]));

-- 3. attempts: only ever +1, only on your own codes
create or replace function public.bump_verification_attempts(p_ids uuid[])
returns void
language sql volatile security definer
set search_path = public
as $$
  update account_verification_codes
     set attempts = coalesce(attempts, 0) + 1
   where id = any(p_ids) and user_id = auth.uid();
$$;
revoke all on function public.bump_verification_attempts(uuid[]) from public, anon;
grant execute on function public.bump_verification_attempts(uuid[]) to authenticated;

drop policy if exists avc_update_own on public.account_verification_codes;
revoke update on public.account_verification_codes from anon, authenticated;
