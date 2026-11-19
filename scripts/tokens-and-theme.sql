-- Queue tokens + business theme colour. Safe to run more than once.
-- Run in Supabase > SQL Editor.
--
-- 1) Every appointment gets a token number for its DATE (in the business
--    time zone): 1, 2, 3 ... restarting every day. Assigned automatically by a
--    trigger, so manual and online bookings both get one, and two bookings can
--    never get the same number. Moving a booking to another day gives it a new
--    number for that day. Cancelled bookings keep their number (never reused).

alter table public.appointments add column if not exists token_number integer;
alter table public.appointments add column if not exists token_date date;

create or replace function public.assign_appointment_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
  d date;
begin
  select coalesce(nullif(b.timezone, ''), 'UTC') into tz from businesses b where b.id = new.business_id;
  d := (new.start_at at time zone coalesce(tz, 'UTC'))::date;

  if tg_op = 'INSERT' or new.token_number is null or new.token_date is distinct from d then
    -- one booking at a time per business + day, so numbers never collide
    perform pg_advisory_xact_lock(hashtext(new.business_id::text || ':' || d::text));
    select coalesce(max(token_number), 0) + 1 into new.token_number
      from appointments
      where business_id = new.business_id and token_date = d and id <> new.id;
    new.token_date := d;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_assign_token on public.appointments;
create trigger appointments_assign_token
  before insert or update of start_at on public.appointments
  for each row execute function public.assign_appointment_token();

-- Number the bookings that already exist (in the order they were made)
with tz as (
  select a.id,
         (a.start_at at time zone coalesce(nullif(b.timezone, ''), 'UTC'))::date as d,
         a.business_id, a.created_at
  from appointments a join businesses b on b.id = a.business_id
  where a.token_number is null
),
numbered as (
  select id, d,
         row_number() over (partition by business_id, d order by created_at, id)
           + coalesce((select max(x.token_number) from appointments x
                       where x.business_id = tz.business_id and x.token_date = tz.d), 0) as n
  from tz
)
update appointments a set token_number = numbered.n, token_date = numbered.d
from numbered where a.id = numbered.id;

create unique index if not exists appointments_token_unique
  on public.appointments (business_id, token_date, token_number)
  where token_number is not null;

-- The public booking page reads the token of the booking it just made
create or replace function public.public_appointment_token(p_appointment_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('tokenNumber', token_number, 'tokenDate', token_date)
  from appointments where id = p_appointment_id;
$$;
revoke all on function public.public_appointment_token(uuid) from public;
grant execute on function public.public_appointment_token(uuid) to anon, authenticated;

-- 2) Theme colour for the dashboard and booking page (hex like #4f6bed; null = default)
alter table public.business_settings add column if not exists theme_color text;
alter table public.business_settings drop constraint if exists valid_theme_color;
alter table public.business_settings
  add constraint valid_theme_color check (theme_color is null or theme_color ~* '^#[0-9a-f]{6}$');

create or replace function public.public_business_flags(p_business_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'onLocationEnabled', coalesce(bool_or(on_location_enabled), false),
    'hidePricesInList', coalesce(bool_or(hide_prices_in_list), false),
    'language', coalesce(max(language), 'en'),
    'themeColor', max(theme_color)
  )
  from business_settings where business_id = p_business_id;
$$;
revoke all on function public.public_business_flags(uuid) from public;
grant execute on function public.public_business_flags(uuid) to anon, authenticated;
