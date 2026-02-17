# Next.js + Supabase Boilerplate

Production-ready starter boilerplate for:

- Next.js (App Router + TypeScript)
- Supabase (Auth + PostgreSQL)
- Prisma (schema + migrations + seed template)
- Vercel deployment

## 1. Prerequisites

- Node.js 20+
- npm 10+
- Supabase project

## 2. Environment Setup

Copy env template:

```bash
cp .env.example .env.local
```

Set values in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Runtime/app queries (pooled)
DATABASE_URL=postgresql://<user>:<password>@<pooler-host>:6543/postgres?sslmode=require

# Prisma migrations (direct)
DIRECT_URL=postgresql://<user>:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

## 3. Install and Run

```bash
npm install
npm run dev
```

## 4. Auth Boilerplate Included

- Login page: `/login`
- Signup page: `/signup`
- Protected route sample: `/dashboard`
- Middleware protection and session refresh: `proxy.ts`, `lib/supabase/middleware.ts`
- Server actions for auth: `app/actions/auth.ts`

## 5. Prisma Boilerplate Included

- Schema: `prisma/schema.prisma`
- Migrations folder: `prisma/migrations/`
- Seed template: `prisma/seed.mjs`
- `datasource db` uses:
  - `url = env("DATABASE_URL")`
  - `directUrl = env("DIRECT_URL")`

Run migrations:

```bash
npm run migrate
```

Run deploy migrations:

```bash
npm run migrate:deploy
```

Run seed template:

```bash
npm run seed
```

## 6. Scripts

- `npm run dev` - run local dev server
- `npm run build` - production build
- `npm run start` - run production build locally
- `npm run lint` - eslint check (zero warnings)
- `npm run format` - eslint autofix pass
- `npm run typecheck` - TypeScript noEmit
- `npm run migrate` - Prisma migrate dev
- `npm run migrate:deploy` - Prisma migrate deploy
- `npm run seed` - run seed template
- `npm run check` - lint + typecheck + build

## 7. Basic Structure

- `app/` - routes, pages, server actions, route handlers
- `components/` - UI components
- `utils/` - generic utilities placeholder
- `lib/` - framework/integration utilities
- `prisma/` - schema, migrations, seed

## 8. Vercel Deployment

1. Import this repo into Vercel.
2. Add all env vars from `.env.local` to Vercel (Preview + Production).
3. Build command: `npm run build`
4. Install command: `npm ci`
5. Deploy.
