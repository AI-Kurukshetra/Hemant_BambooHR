# Engineering Decisions

## D-001: Next.js Full-Stack Baseline

- Decision: Use Next.js App Router for UI + backend handlers.
- Why: Minimizes operational overhead for MVP and aligns with Vercel.

## D-002: Supabase for Auth and Database

- Decision: Use Supabase Auth + PostgreSQL for initial MVP.
- Why: Fast setup, managed infrastructure, native integration.

## D-003: Prisma for Schema Control

- Decision: Use Prisma schema as source for data model evolution.
- Why: Enables controlled migrations and typed access.

## D-004: Quality Gate Before Merge

- Decision: Block regressions with mandatory lint, typecheck, and build checks in CI.
- Why: Requirement is zero lint issues and stable demo readiness.

## D-005: JSON Schema Contract for AI Output

- Decision: Define baseline JSON schema now and harden later with requirements.
- Why: Prevents drift in AI response shape and supports validation.

