# Implementation Plan: Project Foundation Setup

**Branch**: `001-project-foundation-setup` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-project-foundation-setup/spec.md`

## Summary

Stand up the foundation the rest of Agenda Pro builds on: install every library named in the constitution's Technology Stack section (shadcn/ui + Tailwind tokens, React Query, Zustand, Auth.js v5, Prisma 7 + Postgres driver adapter, Zod), document the resulting environment-variable contract in a single `.env.example`, wire Prisma to the hosted Supabase Postgres instance (pooled runtime connection + direct migration connection, server-only access), and remove the `create-next-app` starter scaffold so the repo only contains Agenda Pro's own surface. No application data model, API route, or screen is built in this feature — it is purely dependency, config, and connection wiring.

## Technical Context

**Language/Version**: TypeScript 5 (`^5`, already pinned)

**Primary Dependencies**: Next.js 16.2.9, React 19.2.4, Tailwind CSS v4 (already installed) + shadcn/ui (`shadcn@latest` CLI), `@tanstack/react-query@^5`, `zustand@^5`, `next-auth@beta` (Auth.js v5, `5.0.0-beta.31`) + `@auth/prisma-adapter`, `prisma@7.8.0` / `@prisma/client@7.8.0` + `@prisma/adapter-pg`, `zod@^4` — see `research.md` for version rationale on each.

**Storage**: PostgreSQL hosted on Supabase, accessed exclusively through Prisma + `@prisma/adapter-pg` (pooled connection at runtime, direct connection for migrations).

**Testing**: N/A for this feature — the spec defines no test requirement and the constitution only mandates tests "when explicitly requested by the feature spec" (Development Workflow & Quality Gates); validation here is the manual `quickstart.md` procedure (install, env fill-in, connectivity check, build).

**Target Platform**: Node.js server runtime (Next.js Route Handlers/Server Components) + browser client for the App Router's client-side islands.

**Project Type**: Web application — single Next.js app at the repository root (no `src/` wrapper, matching the existing `app/` scaffold).

**Performance Goals**: N/A (no runtime feature behavior introduced); the only measurable target is process-level — SC-001's "clone to running instance in under 10 minutes."

**Constraints**: All secrets/connection strings come from environment variables only (never hardcoded, per constitution Principle V/VI); the Prisma client and any future NextAuth server config must never be importable from a `"use client"` module (Principle VI, VIII).

**Scale/Scope**: Foundation-only — dependency manifest, one `.env.example`, Prisma schema scaffold (zero models) + its connection config, and scaffold cleanup. No new routes, components, or persisted entities.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Applies in this feature? | Assessment |
|---|---|---|
| I. Multi-Tenant Isolation | Not yet | No tenant-scoped tables exist yet (spec assumption: data modeling is deferred). Nothing in this feature reads/writes tenant data, so there's no tenant filter to omit. Future schema work must add the tenant FK + index per this principle — noted here as a forward obligation, not a gate failure. |
| II. Server-First Next.js / current API usage | Yes | Verified against `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` — no breaking change to `.env*` loading or `NEXT_PUBLIC_` bundling in this Next version; no Pages Router pattern introduced. |
| III. Type-Safe, Validated API Routes | Not yet | No Route Handlers are added in this feature. Zod is installed so the *next* feature that adds a route has it available. |
| IV. Design System & UI Consistency | Partially | Installing shadcn/ui's CLI baseline (`init`) sets up the token system (CSS variables in `globals.css`, no arbitrary hex/px) but adds no screens/layouts, so the "must go through `frontend-design` skill" rule for layout work is not triggered — there is no layout decision being made, only the token plumbing the rule depends on. |
| V. Auth via NextAuth | Yes | Auth.js v5 chosen specifically for native Server Component/Route Handler session helpers (see `research.md` §1); secret lives in `AUTH_SECRET`, server-only, never `NEXT_PUBLIC_*`. |
| VI. Prisma-Mediated DB Access | Yes | `lib/prisma.ts` singleton, server-only by construction (no `"use client"` import path); schema/migrations checked into `prisma/`; connection string only via env. |
| VII. Component Architecture / Client State | Not yet | No components are authored in this feature beyond what `shadcn` CLI generates verbatim (its own primitives, one per file already, per the CLI's own convention). |
| VIII. Prohibited Antipatterns | Yes (guard only) | Nothing in this feature does any of the listed antipatterns; explicitly checked: no client-supplied tenant ID handling (none exists yet), no Prisma import from client code, no secret in `NEXT_PUBLIC_*`. |

**Result**: PASS. No violations; Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-foundation-setup/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── checklists/
    └── requirements.md    # Already produced by /speckit-specify
```

No `contracts/` directory is produced for this feature: it adds no Route Handler, public API, or other externally-consumed interface — only internal dependency/config/connection wiring (consistent with "skip if project is purely internal" guidance for this artifact).

### Source Code (repository root)

```text
app/
├── layout.tsx            # kept as-is
├── page.tsx              # starter hero/grid markup replaced with minimal placeholder
├── globals.css           # starter demo styles removed; shadcn CSS variables/tokens added here
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts   # re-exports handlers from auth.ts (Auth.js v5 route handler)

auth.ts                   # Auth.js v5 config: NextAuth({ adapter: PrismaAdapter(prisma), ... })

lib/
└── prisma.ts             # PrismaClient singleton, constructed with @prisma/adapter-pg, server-only

components/
└── ui/                   # shadcn/ui-generated primitives (one component per file, CLI default)

prisma/
├── schema.prisma          # generator + datasource blocks only, zero models
└── migrations/            # empty until the first model is added

prisma.config.ts           # Prisma 7 config (schema path, migrations path, datasource.url via env())

.env.example               # DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_URL — grouped, placeholders only

public/                    # default create-next-app sample SVGs removed
```

**Structure Decision**: Single Next.js application at the repository root, no `src/` wrapper (keeps the existing `app/` placement). `lib/` and `components/ui/` are introduced now because the dependencies they wrap (Prisma client, shadcn primitives) are installed in this feature; `prisma/` and `prisma.config.ts` are the Prisma 7 convention (schema/config separated from `package.json`, per `research.md` §2).

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
