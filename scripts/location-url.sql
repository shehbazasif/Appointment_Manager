-- On-location bookings: keep the Google Maps link the customer sent (e.g. a
-- short WhatsApp/maps.app.goo.gl link) exactly as pasted, even when no
-- coordinates can be read from it. Safe to run more than once.
alter table public.appointments add column if not exists location_url text;
do $$ begin
  alter table public.appointments add constraint appointments_location_url_len check (location_url is null or length(location_url) <= 1000);
exception when duplicate_object then null; end $$;
