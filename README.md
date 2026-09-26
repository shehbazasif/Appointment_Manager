# RantevouOS

Greece-first appointment management SaaS built with Nuxt 4, PrimeVue and Supabase.

## Supabase setup

The app uses Supabase for **authentication** (email/password) and its Postgres database for all tenant data, through the service-role client (`server/utils/supabase.ts`). The tenant schema lives directly in Supabase: `profiles`, `businesses`, `business_members`, `business_settings`, `services`, `staff`, `staff_services`, `customers`, `appointments`, `appointment_history`, `business_hours`, `business_schedule_exceptions`, `notifications`, `subscriptions`.

1. Create a project at [supabase.com](https://supabase.com) and apply your tenant schema (SQL editor or migrations).
2. Copy `.env.example` to `.env` and fill in:

   | Variable | Where to find it |
   | --- | --- |
   | `SUPABASE_URL` / `SUPABASE_KEY` | Project Settings → API (URL + anon/publishable key) |
   | `SUPABASE_SERVICE_KEY` | Project Settings → API (service_role — server-side only) |

4. Start the dev server and open `http://localhost:3000` — the landing page is the entry flow:

   ```bash
   npm run dev
   ```

### Auth flow

- `/` — public landing page (first flow).
- `/register` — business signs up via Supabase Auth; the workspace (profile, business, OWNER membership, default settings) is provisioned by `POST /api/auth/bootstrap`.
- `/onboarding` — business profile details saved to the organization.
- `/login` — existing users sign in; unauthenticated visits to `/dashboard`, `/onboarding`, `/admin` redirect here.
- `/book/{businessSlug}` — public booking page, no account needed.

Protected API routes verify the Supabase JWT (`server/utils/auth.ts`) and resolve the tenant business from the `business_members` table — the business id is never trusted from the client.

### Demo seed

Create the two demo users in Supabase (Auth → Users → Add user) with the emails `m.shahbazasif512@gmail.com` (admin) and `riders@feroferto.gr` (business owner), copy their UUIDs into `SUPABASE_ADMIN_USER_ID` / `SUPABASE_BUSINESS_USER_ID`, add `SUPABASE_SERVICE_KEY` to `.env`, then run:

```bash
npm run db:seed
```

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
