# Implementation Plan: Workspace Onboarding & Selection

**Branch**: `005-workspace-onboarding` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-workspace-onboarding/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

After login, route the user based on how many workspaces they belong to: zero → an
onboarding screen that creates their first workspace (owner role, auto-activated); exactly
one → straight to the dashboard with that workspace auto-activated; two or more → a
selection screen that activates whichever one they pick. The active workspace is recorded on
the NextAuth JWT session (`session.user.activeWorkspaceId`), set automatically at sign-in
when unambiguous (one membership) or via a Server Action (`unstable_update`) when the user
creates or explicitly picks a workspace. A single shared resolver
(`resolveWorkspaceRoute`) is reused by the dashboard layout and the two new pages so direct
URL navigation can't bypass the routing rules (FR-013/FR-014).

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.9 (App Router), React 19.2.4

**Primary Dependencies**: NextAuth 5.0.0-beta.31 (`auth.ts`/`auth.config.ts`), `@auth/prisma-adapter`,
Prisma 7.8 (`@prisma/client`, `@prisma/adapter-pg`), Zod 4, shadcn/ui (Card, Input, Label,
Button), Tailwind CSS 4

**Storage**: PostgreSQL via Supabase, accessed exclusively through Prisma (new `Workspace`
and `WorkspaceMembership` models + `WorkspaceRole` enum; see `data-model.md`)

**Testing**: No automated test suite exists in this repo yet and the spec does not request
one; verification is manual per `quickstart.md` (per Constitution: "Tests are written when
explicitly requested by the feature spec")

**Target Platform**: Server-rendered web app (Next.js Server Components + Server Actions),
deployed behind NextAuth-protected routes

**Project Type**: Web application — single Next.js project (no separate frontend/backend)

**Performance Goals**: No new performance-sensitive surface; the onboarding/selection
screens are low-traffic, post-login, authenticated-only pages — default Next.js SSR
performance is sufficient (SC-001: under 1 minute end-to-end; SC-004: under 10 seconds to
pick and land on the dashboard, both UX targets, not infra targets)

**Constraints**: Must not change `session.strategy` away from `"jwt"` (required by the
Credentials provider already in use); must not introduce `middleware.ts` (no such file
exists today — see `research.md` §2) or a new client-state library (Constitution Principle
VII restricts global client state to Zustand, server data to React Query — this feature
needs neither, since all reads happen in Server Components and all writes are Server
Actions with redirects)

**Scale/Scope**: 2 new screens (`/onboarding`, `/selecionar-workspace`), 2 new Prisma models
+ 1 enum, 2 new Server Actions, 1 shared routing-resolver function, edits to `auth.ts` (jwt/
session callbacks) and `app/dashboard/layout.tsx` (re-check call)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Tenant Isolation by Default** — PASS. `Workspace` is the tenant root entity
  itself (not a tenant-scoped table), so it carries no tenant FK. `WorkspaceMembership` is
  the join table and carries both `userId` and `workspaceId` FKs with indexes on each
  (Principle VI overlap). `selectWorkspace` never trusts the posted `workspaceId` directly —
  it re-verifies a membership row exists for the session's user before activating it
  (`contracts/workspace-routing.md`).
- **II. Server-First Next.js Architecture** — PASS. `/onboarding` and `/selecionar-workspace`
  are Server Components; only the create-workspace form needs `"use client"` for
  `useActionState` (same pattern as existing `SignupForm`/`LoginForm`). All workspace
  membership reads happen server-side via `resolveWorkspaceRoute`, never client `useEffect`+
  `fetch`.
- **III. Type-Safe, Validated API Routes** — N/A as stated (no new Route Handler is added);
  the two new Server Actions follow the equivalent discipline already used by
  `app/actions/auth.ts`: explicit Zod schema validation, session resolution before any data
  access, and a consistent typed state shape returned to `useActionState`.
- **IV. Design System & UI Consistency** — GATE FOR IMPLEMENTATION: the `frontend-design`
  skill MUST be invoked for both new screens before they are implemented (not yet done by
  this planning step — tracked as an implementation task). shadcn/ui `Card`/`Input`/`Label`/
  `Button` are reused, matching `(auth)` screens; no hardcoded colors/spacing.
- **V. Authentication & Authorization via NextAuth** — PASS. NextAuth remains the only
  session mechanism; the active workspace is carried on the same JWT, not a parallel cookie
  (see `research.md` §1). All three protected entry points resolve the session server-side.
- **VI. Prisma-Mediated Database Access & Migrations** — PASS, with an implementation-time
  obligation: the new `Workspace`/`WorkspaceMembership`/`WorkspaceRole` schema changes MUST
  ship with a corresponding `prisma migrate dev` migration in the same change, no drift.
- **VII. Component Architecture, Separation of Concerns & Client State** — PASS. One
  component per file (new `CreateWorkspaceForm`, `WorkspaceSelectionList`/-item components as
  needed); the routing decision and DB access live in `lib/workspace/workspace-service.ts`,
  not inline in page components; no React Query/Zustand needed (no client-side server-data
  fetching or cross-component client state introduced).
- **VIII. Strictly Prohibited Antipatterns** — PASS, see Principle I note above re:
  `selectWorkspace` re-verifying the posted workspace id.
- **IX. Mobile-First Development** — GATE FOR IMPLEMENTATION: both new screens' mobile
  viewport composition MUST be designed/validated first, per the `frontend-design` skill
  invocation above, before any wider breakpoint.
- **X. User-Facing Language (pt-BR)** — GATE FOR IMPLEMENTATION: all copy on both new
  screens (labels, validation errors, button text) MUST ship in pt-BR from the start, matching
  the existing `(auth)` screens' tone.

No violations requiring the Complexity Tracking table below.

## Project Structure

### Documentation (this feature)

```text
specs/005-workspace-onboarding/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                    # + Workspace, WorkspaceMembership models, WorkspaceRole enum
└── migrations/<timestamp>_add_workspaces/migration.sql  # new migration

types/
└── next-auth.d.ts                   # NEW: Session/JWT module augmentation (activeWorkspaceId)

auth.ts                              # jwt/session callbacks gain activeWorkspaceId logic;
                                      # export unstable_update alongside handlers/auth/signIn/signOut

lib/
├── workspace/
│   └── workspace-service.ts         # NEW: resolveWorkspaceRoute(userId, activeWorkspaceId)
└── validation/
    └── workspace.ts                 # NEW: CreateWorkspaceSchema (Zod)

app/
├── actions/
│   └── workspace.ts                 # NEW: createWorkspace, selectWorkspace Server Actions
├── (workspace)/
│   ├── onboarding/
│   │   └── page.tsx                 # NEW: zero-workspace creation screen
│   └── selecionar-workspace/
│       └── page.tsx                 # NEW: multi-workspace selection screen
└── dashboard/
    └── layout.tsx                   # edited: calls resolveWorkspaceRoute, redirects when needed

components/
└── workspace/
    ├── create-workspace-form.tsx    # NEW: "use client" form (mirrors SignupForm/LoginForm)
    └── workspace-selection-list.tsx # NEW: renders one selectWorkspace form per workspace
```

**Structure Decision**: Single Next.js project (App Router), no frontend/backend split — this
is the existing project shape (`app/`, `components/`, `lib/`, `prisma/` at the repo root).
The two new screens live under a new `(workspace)` route group (organizational only, no
shared layout needed, mirroring the existing `(auth)` group). Routing/DB logic is isolated in
`lib/workspace/workspace-service.ts` so it's reusable from all three protected entry points
without duplicating Prisma queries inline in page components (Constitution Principle VII).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no violations.
