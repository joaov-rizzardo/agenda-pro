# Data Model: Project Foundation Setup

This feature introduces no application/business data entities (no tenants, bookings, etc. — that is explicitly deferred per the spec's Assumptions). It does establish two configuration-level "entities" named in the spec's Key Entities section, plus the empty Prisma schema scaffold they depend on.

## Environment Configuration

Not a persisted/database entity — a deployment-time contract between the running application and its environment, documented once in `.env.example` and supplied per-environment (local `.env`, staging, production).

| Field | Group | Exposure | Notes |
|---|---|---|---|
| `DATABASE_URL` | Database | Server-only | Supabase pooled (PgBouncer transaction mode, port 6543) connection string; consumed by the Prisma driver adapter at runtime. |
| `DIRECT_URL` | Database | Server-only | Supabase direct (port 5432) connection string; consumed only by Prisma Migrate / introspection via the schema's `datasource.directUrl`. |
| `AUTH_SECRET` | Authentication | Server-only | Auth.js v5 session/JWT signing secret. |
| `AUTH_URL` | Authentication | Server-only, optional | Only required when the canonical deployment URL can't be auto-detected (e.g. some non-Vercel hosts). |

Validation rule (FR-004/FR-005): every entry above is a clearly fake placeholder in `.env.example`; none is prefixed `NEXT_PUBLIC_` since none is safe to expose to the browser.

## Database Connection

The single configured link between the Prisma-mediated data-access layer and the hosted Supabase Postgres instance, established once in `lib/prisma.ts` and reused by all future schema/query work.

- **Inputs**: `DATABASE_URL` (runtime queries via `@prisma/adapter-pg`), `DIRECT_URL` (migrations, via `prisma.config.ts` schema datasource).
- **Lifecycle**: a single `PrismaClient` instance constructed with the `pg` driver adapter, exported as a module-level singleton to avoid exhausting connections across hot-reloads in dev (standard Next.js dev-mode singleton pattern, scoped with a `globalThis` guard).
- **Access constraint** (FR-008, constitution Principle VI): `lib/prisma.ts` and the generated Prisma client are imported only from server-side modules (Route Handlers, Server Components, server actions); no `"use client"` module may import either.
- **Schema state**: `prisma/schema.prisma` exists with the `generator`/`datasource` blocks only — zero models, matching the spec's assumption that no application data model is designed in this feature.
