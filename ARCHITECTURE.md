# Architecture

## Runtime

- Next.js App Router for frontend + server routes
- Supabase Auth for session management
- Supabase PostgreSQL as source of truth
- Prisma as schema/migration and typed DB access layer

## High-Level Layout

- `app/` - routes, pages, server actions, API handlers
- `features/` - domain feature modules
- `services/` - integrations and orchestration (AI, external APIs)
- `lib/` - framework/platform utilities
- `types/` - shared domain types
- `schemas/` - JSON schemas for AI output validation
- `prisma/` - database schema and migrations

## Request Flow (Protected Route)

1. Request enters `proxy.ts`.
2. Supabase session is refreshed with `lib/supabase/middleware.ts`.
3. Unauthenticated access to `/dashboard` is redirected to `/login`.
4. Server component checks user session again via `getServerSupabaseClient`.

## Non-Functional Baseline

- Strict TypeScript enabled
- ESLint enforced with zero warnings
- CI gate: lint + typecheck + build
