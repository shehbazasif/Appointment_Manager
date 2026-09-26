# Run doc — RantevouOS (Nuxt 4 + Supabase)

## Artifacts (fresh checkout)

1. Install dependencies (Supabase JS only — Drizzle/pg were removed):

   ```bash
   npm install
   ```

2. Env: `.env` must define `SUPABASE_URL` and `SUPABASE_KEY`
   (anon/publishable). For all tenant-data routes the server also needs
   `SUPABASE_SERVICE_KEY` (service_role) — copy it from Supabase →
   Project Settings → API. Never commit the real values.
   Template: `.env.example`.

3. The tenant schema lives in the Supabase project itself (tables:
   `profiles`, `businesses`, `business_members`, `business_settings`,
   `services`, `staff`, `staff_services`, `customers`, `appointments`,
   `appointment_history`, `business_hours`, `business_schedule_exceptions`,
   `notifications`, `subscriptions`). No local migrations to run.

4. Optional demo data: create two users in Supabase Auth → Users
   (`m.shahbazasif512@gmail.com`, `riders@feroferto.gr`), put their UUIDs in
   `SUPABASE_ADMIN_USER_ID` / `SUPABASE_BUSINESS_USER_ID`, then
   `npm run db:seed`.

## Run

```bash
npm run dev -- --port 3000
```

- Always pass `--port 3000`: without it Nuxt picks a random free port if
  3000 is taken, which breaks the preview.
- Detached launch (Windows):

  ```powershell
  powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','3000' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
  ```

  stdout and stderr must go to different files. Confirm with
  `Get-Process -Id <pid>` and poll `http://localhost:3000/` until it answers.

## Verify

- `GET /` → 200 (landing).
- `GET /dashboard` → 302 to `/login` (auth middleware).
- `GET /api/me` → 401 JSON without a session.
- First render prints a pre-existing `[PrimeUI] license` warning and a stray
  `/security` router warning (footer link) — harmless.
