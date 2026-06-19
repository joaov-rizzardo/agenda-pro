# Quickstart: Validating the Project Foundation Setup

Prerequisites: Node.js toolchain already used by this repo (`npm`), a Supabase project with its pooled and direct connection strings available.

## 1. Install dependencies (validates User Story 1 / FR-001, FR-002)

```bash
npm install
```

**Expected**: install completes without peer-dependency overrides/forced resolutions, and every library named in the constitution's Technology Stack section (`next-auth`, `@auth/prisma-adapter`, `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `zod`, `@tanstack/react-query`, `zustand`, shadcn/ui's generated components + its runtime deps) is present in `package.json`.

```bash
npm run dev
```

**Expected**: dev server starts with no missing-module or version-conflict errors (server can be stopped immediately after the "Ready" log line — this step only proves resolution, not feature behavior).

## 2. Fill in environment configuration (validates User Story 2 / FR-003–FR-005)

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` (generate one, e.g. `npx auth secret`, or any sufficiently random string for local dev) with real values. See `data-model.md` for what each variable is for and its exposure (all server-only at this stage).

**Expected**: every variable the app reads at this stage (per `data-model.md`) has a line in `.env.example`; no entry holds a real secret/connection string, only placeholders.

## 3. Verify the database connection (validates User Story 3 / FR-006, FR-007)

```bash
npx prisma validate
npx prisma db pull
```

**Expected**: `prisma validate` confirms the schema/config are well-formed; `prisma db pull` reaches the configured Supabase instance via `DIRECT_URL` and exits successfully without applying any destructive change (it only introspects).

```bash
npx prisma generate
```

**Expected**: the Prisma client generates into the configured output path with no errors. Confirm it's importable only from a server module:

```bash
grep -rl "generated/prisma\|@prisma/client" app components --include='*.tsx' 2>/dev/null | xargs -r grep -l '"use client"'
```

**Expected**: no output (no `"use client"` file imports the Prisma client).

## 4. Confirm scaffold cleanup (validates User Story 4 / FR-009, FR-010)

```bash
git status --short
ls public
```

**Expected**: the default `create-next-app` sample SVGs are gone from `public/`, `app/page.tsx` no longer contains the starter hero/grid markup, and:

```bash
npm run build
```

**Expected**: production build completes with zero errors and no broken references to removed files.

## Full success criteria (SC-001)

Steps 1–4 above, run in order on a clean checkout with a real Supabase connection string at hand, should complete in under 10 minutes.
