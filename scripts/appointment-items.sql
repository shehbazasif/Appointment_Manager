-- Manual bookings: pet name, several services in one booking (with how many
-- pets each) and the price agreed with the customer. Safe to run more than once.
alter table public.appointments
  add column if not exists pet_name text,
  add column if not exists items jsonb,
  add column if not exists price numeric(10, 2);
do $$ begin
  alter table public.appointments add constraint appointments_pet_name_len check (pet_name is null or length(pet_name) <= 120);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.appointments add constraint appointments_price_range check (price is null or (price >= 0 and price <= 1000000));
exception when duplicate_object then null; end $$;
