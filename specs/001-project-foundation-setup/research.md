# Research: Project Foundation Setup

**Input**: Technical Context unknowns from `plan.md`, constitution Technology Stack section, and current installed versions (`next@16.2.9`, `react@19.2.4`).

## 1. Authentication library version

- **Decision**: `next-auth@beta` (Auth.js v5, currently `5.0.0-beta.31`), with `@auth/prisma-adapter` for the database adapter.
- **Rationale**: Constitution Principle V requires server-side session enforcement via NextAuth inside Server Components and Route Handlers. Auth.js v5 is the version with first-class App Router support (`auth()` callable directly in Server Components/Route Handlers, a single `auth.ts` config exporting `handlers`/`auth`/`signIn`/`signOut`). Verified peer dependencies (`npm view next-auth@beta peerDependencies`) declare `"next": "^14.0.0-0 || ^15.0.0 || ^16.0.0"` and `"react": "^18.2.0 || ^19.0.0"` — compatible with the pinned `next@16` / `react@19`.
- **Alternatives considered**: `next-auth@4` (dist-tag `latest`, `4.24.14`) — stable but designed around the Pages Router `[...nextauth]` API; using it in App Router requires extra wrapper code and lacks a native `auth()` server helper, working against Principle V's "server-side session helpers inside Server Components" requirement. Rejected despite v5 being beta, because the API fit is materially better and the peer-dependency range explicitly supports Next 16.
- **Env var convention**: v5 idiomatically reads `AUTH_SECRET` (and optionally `AUTH_URL`), replacing v4's `NEXTAUTH_SECRET`/`NEXTAUTH_URL` (still accepted for back-compat, but `.env.example` will document the v5 names).

## 2. ORM version and database driver

- **Decision**: `prisma@7.8.0` / `@prisma/client@7.8.0` with the `@prisma/adapter-pg` driver adapter, configured via `prisma.config.ts` (not the legacy `package.json#prisma` key).
- **Rationale**: Prisma 7's `PrismaClient` **throws at initialization** if no driver adapter is supplied — confirmed in the engine source (`ClientEngine` constructor raises `PrismaClientInitializationError` when neither `adapter` nor `accelerateUrl` is set). There is no more engine-binary fallback for PostgreSQL. `@prisma/adapter-pg` (node-postgres/`pg`-based) is Prisma's official TCP adapter for plain PostgreSQL, which is what Supabase exposes. Schema config also moves from `package.json` to `prisma.config.ts` (`defineConfig({ schema, migrations, datasource: { url: env(...) } })`) in this major version.
- **Alternatives considered**: Prisma Postgres / Accelerate (`accelerateUrl`) — rejected, the project uses a self-hosted Supabase Postgres instance, not Prisma's managed database or query-caching proxy. `@prisma/adapter-better-sqlite3` etc. — not applicable, datasource is PostgreSQL per constitution.
- **Generator output**: schema uses `generator client { provider = "prisma-client", output = "../generated/prisma" }` (the new ESM-style generated client, no longer always re-exported as `@prisma/client`'s default import path) — the singleton in `lib/prisma.ts` imports from the generated path and constructs `new PrismaClient({ adapter })`.

## 3. Supabase connection string topology

- **Decision**: Two env vars feed Prisma's datasource — `DATABASE_URL` (Supabase's pooled "Transaction" pooler endpoint, port `6543`, used at runtime by `@prisma/adapter-pg`) and `DIRECT_URL` (Supabase's direct connection, port `5432`, used only by Prisma Migrate / introspection via `directUrl` in the Prisma schema's `datasource` block).
- **Rationale**: Supabase's connection pooler (PgBouncer, transaction mode) does not support the session-level features (prepared statements, advisory locks) that `prisma migrate`/`db pull` need, so Prisma's documented pattern for pooled providers is to split runtime queries (pooled) from migrations (direct). This avoids the classic "prepared statement already exists" failure under PgBouncer transaction mode.
- **Alternatives considered**: Single connection string for both — rejected, breaks migrations against a pooled endpoint. Supabase's "Session mode" pooler for everything — rejected, defeats the purpose of pooling for the high-concurrency runtime path.

## 4. UI primitives setup (shadcn/ui + Tailwind v4)

- **Decision**: `npx shadcn@latest init` against the existing Tailwind v4 setup (`tailwindcss@^4`, `@tailwindcss/postcss` already installed) — no `tailwind.config.js` is generated (Tailwind v4 is CSS-first via `@theme` in `app/globals.css`), `cssVariables: true`, `rsc: true`, default import aliases `@/components`, `@/lib`.
- **Rationale**: shadcn's CLI natively detects Tailwind v4 and skips the JS config file, writing design tokens as CSS variables in `globals.css` — this aligns with constitution Principle IV's token requirement (no hardcoded hex/px values) directly out of the box.
- **Alternatives considered**: Manually vendoring Radix primitives without the CLI — rejected, duplicates what Principle IV/VIII already mandate using shadcn/ui for.

## 5. Client-side data & state libraries

- **Decision**: `@tanstack/react-query@^5` and `zustand@^5`, both current majors.
- **Rationale**: Both declare React 19 in their peer ranges (`react-query`: `"react": "^18 || ^19"`; `zustand`: `"react": ">=18.0.0"`), matching the pinned `react@19.2.4`. These are the libraries Principle VII names explicitly for client-side server-data and client-only shared state respectively.
- **Alternatives considered**: none — constitution names these libraries directly, no other client data/state library is permitted.

## 6. Schema validation library

- **Decision**: `zod@^4` (current stable, `4.4.3`).
- **Rationale**: Constitution Principle III mandates explicit schema validation on every Route Handler; Zod is the long-standing de facto standard already implied by "e.g., Zod" in Principle III's text, and v4 is the current stable major with no breaking incompatibility with Next 16/React 19 (it has no peer dependency on either).
- **Alternatives considered**: Zod v3 — still maintained but superseded; no reason to start a new project on the older major.

## 7. Environment variable inventory for `.env.example`

- **Decision**: Group entries by purpose with comments, server-only by default, `NEXT_PUBLIC_` only where a value is genuinely needed in browser code:
  - **Database**: `DATABASE_URL` (pooled, runtime), `DIRECT_URL` (direct, migrations).
  - **Authentication**: `AUTH_SECRET`, `AUTH_URL` (optional, only needed if the deployment URL can't be auto-detected).
  - No OAuth provider placeholders are added yet — the spec's assumption section scopes "initial dependencies" to what the constitution names today; provider-specific credentials are added when a specific auth provider is wired up, not preemptively guessed.
- **Rationale**: FR-003/FR-004/FR-005 require every variable the app reads at this stage, grouped, placeholder-only, and marked public vs. server-only. Since no Route Handlers or sign-in providers exist yet beyond the NextAuth/Prisma wiring itself, the inventory is intentionally minimal rather than speculative.
- **Alternatives considered**: Pre-populating placeholder OAuth client IDs (Google/GitHub etc.) — rejected per the spec's own assumption that feature-specific config is added when that feature is built, to avoid documenting variables nothing reads yet (would violate SC-002's "zero undefined configuration" framing in reverse — an unused documented var is not a failure, but an *undocumented used* one is the actual risk being guarded against, so we stick to what is actually read).

## 8. Next.js scaffold cleanup scope

- **Decision**: Remove `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`, and the default demo content inside `app/page.tsx`/`app/globals.css` (the `create-next-app` starter hero/grid markup and its associated styles), while keeping `app/layout.tsx`, `app/favicon.ico`, and the App Router file structure itself.
- **Rationale**: FR-009/FR-010 and User Story 4 scope cleanup to "default scaffold content," not to the App Router structure itself. `node_modules/next/dist/docs` confirms no change to the `app/` directory's special-file conventions in Next 16 that would require restructuring during cleanup.
- **Alternatives considered**: Deleting `app/page.tsx` entirely — rejected, a root route must still resolve (build would 404 or error); it is replaced with minimal placeholder content rather than removed.
