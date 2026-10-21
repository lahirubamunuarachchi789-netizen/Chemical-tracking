# Concord ChemTrack

Chemical usage tracking for **Concord Footwear (Pvt) Ltd**.

Responsive web application (PC + mobile) built with Next.js, React, Tailwind CSS
and Lucide icons, backed by Supabase and deployed on Vercel.

> **Status:** Step 1 complete - responsive login / registration interface with
> authentication against the Supabase `users` table.

---

## Tech stack

| Layer     | Technology                                                |
| --------- | --------------------------------------------------------- |
| Framework | Next.js 15 (App Router, TypeScript)                       |
| UI        | React 19 + Tailwind CSS 4 + Lucide icons                 |
| Database  | Supabase (PostgreSQL) - `public.users` table              |
| Auth      | Custom table auth: bcrypt + signed JWT in an httpOnly cookie |
| Hosting   | Vercel                                                     |
| Source    | GitHub - `lahirubamunuarachchi789-netizen/Chemical-tracking` |

---

## Getting started

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# fill in the real values in .env.local
npm run dev
```

Open <http://localhost:3000> - you will be redirected to `/login`.

### Environment variables

| Variable                        | Where to set          | Notes                                               |
| ------------------------------- | --------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `.env.local` + Vercel | Safe to expose (project URL only)                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Safe to expose                                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | `.env.local` + Vercel | **Server only** - never prefix with `NEXT_PUBLIC_`  |
| `AUTH_SESSION_SECRET`           | `.env.local` + Vercel | 32+ chars, signs the session JWT                    |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Database setup

The application authenticates against a **custom `users` table** (not Supabase
Auth). Apply the schema in the Supabase SQL Editor:

```bash
# Option A - paste supabase/migrations/0001_create_users.sql into the SQL Editor
# Option B - with the Supabase CLI
supabase db execute --file supabase/migrations/0001_create_users.sql
```

| Column       | Type          | Notes                        |
| ------------ | ------------- | ---------------------------- |
| `id`         | `uuid`        | Primary key, auto-generated  |
| `username`   | `text`        | Unique, the login identifier |
| `password`   | `text`        | bcrypt hash                  |
| `created_at` | `timestamptz` | Auto-generated               |

Then seed the first user (username `admin`, password `admin123`):

```bash
supabase db execute --file supabase/seed.sql
```

> Change the seeded password before going to production.
> Legacy **plaintext** rows still work: the API transparently upgrades them to
> a bcrypt hash on the first successful sign-in.

---

## Authentication design

1. The browser posts `{ username, password }` to `/api/auth/login`.
2. The route handler queries the `users` table using the **service-role**
   client (`src/lib/supabase/server.ts`).
3. Passwords are compared with bcrypt (constant-time), falling back to a
   timing-safe plaintext compare for legacy rows.
4. On success the server signs a **JWT** (`HS256`, 8 hour expiry) with
   `AUTH_SESSION_SECRET` and stores it in an `httpOnly`, `Secure`,
   `SameSite=Lax` cookie.
5. `/dashboard` is protected by `src/middleware.ts` (edge). The middleware
   verifies the JWT signature and expiry, and the page re-verifies it
   server-side.
6. The password hash is never returned to the client.

### Session handling

The session cookie is a signed JWT. The Edge middleware validates the
signature and expiry (`src/lib/auth/edge-session.ts`), so an expired or
tampered cookie is treated as "not signed in" and is **cleared** on the way
out. Without that cleanup the app would enter an endless redirect loop
(`/login` → `/dashboard` → `/login`) and lock the user out entirely.

| Route                | Method | Purpose                          |
| -------------------- | ------ | -------------------------------- |
| `/api/auth/login`    | POST   | Sign in, sets the session cookie  |
| `/api/auth/register` | POST   | Create an account, signs the user in |
| `/api/auth/logout`   | POST   | Clears the session cookie         |
| `/api/auth/me`       | GET    | Returns the current user          |

---

## Keeping credentials out of GitHub

`.env.local` is listed in `.gitignore` and `.env.example` (placeholders only)
is committed. In addition:

- `scripts/check-for-secrets.mjs` scans staged files for Supabase secret keys,
  service-role JWTs and assigned key values, and **blocks the commit**.
- Install it as a git hook:

```bash
npm run secrets:install-hook
```

- The service-role key is read **only** in `src/lib/supabase/server.ts`, which
  imports `server-only` - importing it from a client component fails the build.
- On Vercel, add the variables under **Project -> Settings -> Environment
  Variables** (mark the service-role key as *sensitive*). Never add them to
  `next.config.ts`.

---

## Project structure

```
src/
  app/
    api/auth/{login,register,logout,me}/route.ts   API route handlers
    dashboard/page.tsx                              Protected page
    login/page.tsx                                  Login + registration UI
    globals.css                                     Tailwind theme tokens
    layout.tsx                                      Root layout + metadata
  components/auth/
    auth-form.tsx                                   Sign In / Register form
    brand-mark.tsx                                  Logo + wordmark
    logout-button.tsx                               Sign-out control
  lib/
    auth/                                           Password, session, cookies
      edge-session.ts                               Edge-safe JWT verification
    supabase/                                       Browser + server clients
  middleware.ts                                     Edge route protection
supabase/
  migrations/0001_create_users.sql                  `users` table schema
  seed.sql                                           First user
scripts/check-for-secrets.mjs                       Credential leak guard
```

---

## Available scripts

| Script                         | Description                            |
| ------------------------------ | -------------------------------------- |
| `npm run dev`                  | Start the dev server                   |
| `npm run build`                | Production build                       |
| `npm start`                    | Run the production build               |
| `npm run lint`                 | ESLint                                 |
| `npm run typecheck`            | TypeScript check (no emit)             |
| `npm run secrets:check`        | Scan all tracked files for credentials  |
| `npm run secrets:install-hook` | Install the pre-commit guard           |
| `npm run mock:supabase`        | Local mock of the Supabase REST API    |

### Testing without a live Supabase project

`scripts/mock-supabase.mjs` implements the small slice of the Supabase REST API
that the app uses (`GET`/`POST`/`PATCH` on `public.users`). It lets you
exercise register, login, logout, the legacy-password upgrade and the protected
dashboard without touching a real database:

```bash
# terminal 1
npm run mock:supabase

# terminal 2 - point .env.local at the mock
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=local-mock-anon-key
#   SUPABASE_SERVICE_ROLE_KEY=local-mock-service-role-key
npm run dev
```

Seed accounts via environment variables:

```bash
MOCK_SEED_USER=admin MOCK_SEED_PASSWORD=admin123 npm run mock:supabase
MOCK_SEED_LEGACY_USER=olduser MOCK_SEED_LEGACY_PASSWORD=legacy123 npm run mock:supabase
```

> The mock is a development aid only - it is never used in production.

---

## Deployment to Vercel

1. Push the code to GitHub:

   ```bash
   git remote add origin https://github.com/lahirubamunuarachchi789-netizen/Chemical-tracking.git
   git push -u origin main
   ```

2. Import the repository at <https://vercel.com/new>.
3. Add the four environment variables (see the table above).
4. Deploy - the framework preset (Next.js) is detected automatically.

---

© Concord Footwear (Pvt) Ltd

