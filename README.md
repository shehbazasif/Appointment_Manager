# RantevouOS

Greece-first appointment management SaaS built with Nuxt 4, PrimeVue, Drizzle ORM and Supabase.

## Supabase setup

The app uses Supabase for **authentication** (email/password) and **Postgres** for the tenant database.

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the tenant schema (`server/db/schema.ts`) to the Supabase database:

   ```bash
   npm run db:push        # or: npm run db:generate && npm run db:migrate
   ```

3. Copy `.env.example` to `.env` and fill in:

   | Variable | Where to find it |
   | --- | --- |
   | `SUPABASE_URL` / `SUPABASE_KEY` | Project Settings → API |
   | `DATABASE_URL` | Project Settings → Database (Session pooler URI works everywhere) |

4. Start the dev server and open `http://localhost:3000` — the landing page is the entry flow:

   ```bash
   npm run dev
   ```

### Auth flow

- `/` — public landing page (first flow).
- `/register` — business signs up via Supabase Auth; the workspace (user row, organization, OWNER membership) is provisioned by `POST /api/auth/bootstrap`.
- `/onboarding` — business profile details saved to the organization.
- `/login` — existing users sign in; unauthenticated visits to `/dashboard`, `/onboarding`, `/admin` redirect here.
- `/book/{businessSlug}` — public booking page, no account needed.

Protected API routes verify the Supabase JWT (`server/utils/auth.ts`) and resolve the tenant organization from the membership table — the organization id is never trusted from the client.

### Demo seed

Create the two demo users in Supabase (Auth → Users → Add user) with the emails `m.shahbazasif512@gmail.com` (admin) and `riders@feroferto.gr` (business owner), copy their UUIDs into `SUPABASE_ADMIN_USER_ID` / `SUPABASE_BUSINESS_USER_ID`, then run:

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
