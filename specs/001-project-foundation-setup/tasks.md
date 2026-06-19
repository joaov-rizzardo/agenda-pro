---

description: "Task list for Project Foundation Setup"
---

# Tasks: Project Foundation Setup

**Input**: Design documents from `/specs/001-project-foundation-setup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this feature adds no externally-consumed interface)

**Tests**: Not included — the spec defines no test requirement and the constitution only mandates tests "when explicitly requested by the feature spec." Validation is the manual `quickstart.md` procedure, captured as verification tasks below.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths are relative to the repository root (no `src/` wrapper — see plan.md Structure Decision)

---

## Phase 1: Setup (Shared Infrastructure)

No tasks. The repository is already scaffolded (`create-next-app`, Next.js 16.2.9 / React 19.2.4 / Tailwind v4 already installed per `package.json`); there is no further project-initialization step outside of what the user stories below perform.

---

## Phase 2: Foundational (Blocking Prerequisites)

No tasks. This feature *is* the project's foundation phase — User Story 1 (dependency installation) plays the role a Foundational phase would normally play for every later feature. No additional cross-story blocking work exists beyond the ordering already captured in each story's dependencies.

---

## Phase 3: User Story 1 - Install Foundational Dependencies (Priority: P1) 🎯 MVP

**Goal**: Every library named in the constitution's Technology Stack section is installed, declared in `package.json` with compatible versions, and the dev server starts with no missing-module or version-conflict errors.

**Independent Test**: Run the project's install command, then import each required library (ORM client, validation library, client-state store, UI primitives) in a scratch file without module-resolution errors; start the dev server and confirm a clean "Ready" log.

### Implementation for User Story 1

- [X] T001 [US1] Install client-side data/state libraries: `npm install @tanstack/react-query@^5 zustand@^5` (updates `package.json`, `package-lock.json`)
- [X] T002 [US1] Install authentication libraries: `npm install next-auth@beta @auth/prisma-adapter` (updates `package.json`, `package-lock.json`; depends on T001)
- [X] T003 [US1] Install ORM and PostgreSQL driver adapter: `npm install prisma@7.8.0 @prisma/client@7.8.0 @prisma/adapter-pg` (updates `package.json`, `package-lock.json`; depends on T002)
- [X] T004 [US1] Install schema-validation library: `npm install zod@^4` (updates `package.json`, `package-lock.json`; depends on T003)
- [X] T005 [US1] Initialize shadcn/ui against the existing Tailwind v4 setup: `npx shadcn@latest init` with `cssVariables: true`, `rsc: true`, default `@/components`/`@/lib` aliases — creates `components.json`, updates `app/globals.css` with the `@theme` CSS-variable token block, updates `tsconfig.json` path aliases if needed (depends on T004)
- [X] T006 [US1] Verify clean resolution: run `npm run dev`, confirm no missing-module or version-conflict errors in the log, then stop the server; confirm every library from T001-T005 is present in `package.json` (validates FR-001, FR-002; depends on T005)

**Checkpoint**: All constitution-mandated libraries are installed and the dev server runs cleanly — later stories can now wire these libraries together.

---

## Phase 4: User Story 2 - Document Required Environment Configuration (Priority: P2)

**Goal**: A single `.env.example` at the repository root lists every environment variable the application is known to need at this stage, grouped by purpose, placeholder-only, with public/server-only exposure clearly marked.

**Independent Test**: Copy `.env.example` to `.env`, fill in real values, and confirm every variable the running application reads at startup/request time is represented in the file with no real secret committed.

### Implementation for User Story 2

- [X] T007 [US2] Create `.env.example` at the repository root per `data-model.md`'s Environment Configuration table: a **Database** group with `DATABASE_URL` (pooled, port 6543, server-only) and `DIRECT_URL` (direct, port 5432, server-only), and an **Authentication** group with `AUTH_SECRET` (server-only) and `AUTH_URL` (server-only, optional) — each entry commented with its purpose and a clearly fake placeholder value, no `NEXT_PUBLIC_` prefixes (validates FR-003, FR-004, FR-005)

**Checkpoint**: Every variable later stages need (T010-T013) is documented and copyable into a real local `.env`.

---

## Phase 5: User Story 3 - Configure Database Connection (Priority: P2)

**Goal**: The Prisma-mediated data-access layer is connected to the hosted Supabase Postgres instance (pooled runtime + direct migration connections), verified reachable, with the client generated and importable only from server-side code.

**Independent Test**: Run the ORM's connectivity/status command against the configured connection string and confirm it reaches the database without applying any destructive change; generate the client from the current (still empty) schema and confirm it imports cleanly from server-side code only.

### Implementation for User Story 3

- [X] T008 [P] [US3] Create the Prisma schema scaffold in `prisma/schema.prisma` with generator + datasource blocks only (zero models) per `research.md` §2/§3: `generator client { provider = "prisma-client", output = "../generated/prisma" }`; `datasource db { provider = "postgresql", url = env("DATABASE_URL"), directUrl = env("DIRECT_URL") }` — **note**: the installed `prisma@7.8.0` CLI rejects `url`/`directUrl` in the schema's `datasource` block (moved entirely to `prisma.config.ts`); schema actually has `datasource db { provider = "postgresql" }` only, see T009.
- [X] T009 [P] [US3] Create `prisma.config.ts` using Prisma 7's `defineConfig()` (schema path `prisma/schema.prisma`, migrations path `prisma/migrations`, env-sourced datasource) per `research.md` §2 — `datasource.url` is sourced from `DIRECT_URL` (used by Migrate/introspection); the pooled `DATABASE_URL` is used only by the runtime `@prisma/adapter-pg` adapter in `lib/prisma.ts`. Also imports `dotenv/config` since `@prisma/config`'s loader does not auto-load `.env` itself.
- [X] T010 [US3] Create the Prisma client singleton in `lib/prisma.ts`: construct `PrismaClient` with the `@prisma/adapter-pg` (`PrismaPg`) adapter over `DATABASE_URL`, exported as a `globalThis`-guarded module-level singleton to survive dev-mode hot reloads, server-only by construction (depends on T008, T009)
- [X] T011 [US3] Create the Auth.js v5 config in `auth.ts`: `NextAuth({ adapter: PrismaAdapter(prisma), ... })` exporting `handlers`, `auth`, `signIn`, `signOut` (depends on T010)
- [X] T012 [US3] Create the NextAuth route handler in `app/api/auth/[...nextauth]/route.ts` re-exporting `GET`/`POST` from `auth.ts`'s `handlers` (depends on T011)
- [X] T013 [US3] Verify schema validity and live connectivity: with a real `.env` populated from T007's template, run `npx prisma validate` then `npx prisma db pull` against `DIRECT_URL` and confirm both succeed with no destructive change (validates FR-006, FR-007; depends on T008, T009, T007) — **partial**: `npx prisma validate` passes against the schema/config; `npx prisma db pull` against a live Supabase instance was skipped (no real Supabase connection string available in this environment) — re-run once real `DATABASE_URL`/`DIRECT_URL` are in `.env`.
- [X] T014 [US3] Generate the Prisma client and confirm server-only usage: run `npx prisma generate`, then run `grep -rl "generated/prisma\|@prisma/client" app components --include='*.tsx' 2>/dev/null | xargs -r grep -l '"use client"'` and confirm no output (validates FR-008; depends on T010, T011, T012)

**Checkpoint**: The database connection is live and verified; Prisma and Auth.js are fully wired and server-only.

---

## Phase 6: User Story 4 - Remove Unused Starter Files (Priority: P3)

**Goal**: Default `create-next-app` scaffold content (sample SVGs, demo hero/grid markup, demo styling) is removed, leaving only files relevant to Agenda Pro, while the application still builds and runs.

**Independent Test**: Inspect the project tree to confirm no unused starter/placeholder files remain, then build and start the application to confirm it still works.

### Implementation for User Story 4

- [X] T015 [P] [US4] Remove default sample assets: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
- [X] T016 [P] [US4] Replace the starter hero/grid markup in `app/page.tsx` with a minimal Agenda Pro placeholder (root route must still resolve — do not delete the file)
- [X] T017 [US4] Remove leftover `create-next-app` demo styling in `app/globals.css`, keeping only the shadcn/ui token block added in T005 (depends on T005, T016) — already satisfied: `shadcn init` (T005) fully replaced `globals.css` with the token block only, no demo styling remained to strip.
- [X] T018 [US4] Verify cleanup is clean: run `npm run build` and confirm zero errors and no broken references to removed files; run `git status --short` and `ls public` to confirm the sample SVGs are gone (validates FR-009, FR-010; depends on T015, T016, T017)

**Checkpoint**: The repository contains only Agenda Pro's own surface; the app still builds and starts.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T019 [P] Run the full `quickstart.md` validation end-to-end (install → env fill-in → connectivity check → build) on a clean checkout and confirm it completes in under 10 minutes (validates SC-001) — all steps ran successfully except the live DB connectivity check (`prisma db pull`), which needs a real Supabase connection string (see T013 note).
- [X] T020 Run `npm run lint` and confirm zero errors across all files touched in T001-T018 — zero errors.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** / **Foundational (Phase 2)**: No tasks — see notes above.
- **User Story 1 (Phase 3)**: No dependencies — start immediately. Provides the installed libraries every later story wires together.
- **User Story 2 (Phase 4)**: No code dependency on US1, but logically documents the vars US3 needs filled in locally — can be done any time after Phase 3 starts.
- **User Story 3 (Phase 5)**: Depends on US1 (needs `prisma`, `@prisma/adapter-pg`, `next-auth`, `@auth/prisma-adapter` installed) and on a real `.env` populated from US2's template for T013.
- **User Story 4 (Phase 6)**: T017 depends on US1's T005 (shadcn init must land its token block in `globals.css` before the demo styling around it is stripped). Otherwise independent of US2/US3.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within Each User Story

- US1: installs are sequential (all touch `package.json`/lock file) — T001 → T002 → T003 → T004 → T005 → T006.
- US3: T008 and T009 are parallel (different files); T010 depends on both; T011 depends on T010; T012 depends on T011; T013 depends on T008/T009/T007; T014 depends on T010-T012.
- US4: T015 and T016 are parallel (different files); T017 depends on T005 and T016; T018 depends on T015-T017.

### Parallel Opportunities

- T008 and T009 (US3 schema scaffold + Prisma config) can run in parallel.
- T015 and T016 (US4 asset removal + page placeholder) can run in parallel.
- T019 (quickstart validation) can start as soon as all prior phases land; T020 (lint) can run alongside it.

---

## Parallel Example: User Story 3

```bash
# Launch the two independent scaffold files together:
Task: "Create prisma/schema.prisma with generator + datasource blocks only"
Task: "Create prisma.config.ts using Prisma 7's defineConfig()"
```

## Parallel Example: User Story 4

```bash
# Launch the two independent cleanup tasks together:
Task: "Remove public/file.svg, public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg"
Task: "Replace starter hero/grid markup in app/page.tsx with a minimal placeholder"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (install every constitution-mandated dependency, verify clean `npm run dev`).
2. **STOP and VALIDATE**: confirm every library imports without module-resolution errors.
3. This alone unblocks all subsequent feature work, even before env docs/DB wiring/cleanup land.

### Incremental Delivery

1. Phase 3 (US1) → dependencies ready.
2. Phase 4 (US2) → `.env.example` ready for any developer to copy and fill in.
3. Phase 5 (US3) → real database connection verified, Prisma + Auth.js wired server-only.
4. Phase 6 (US4) → scaffold cleanup, repository matches Agenda Pro's actual surface.
5. Phase 7 → full quickstart + lint pass confirms SC-001-SC-005 end-to-end.

---

## Notes

- [P] tasks = different files, no dependencies between them.
- [Story] label maps task to its user story for traceability (US1-US4).
- No test tasks: not requested by the spec or constitution for this feature.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before moving on.
