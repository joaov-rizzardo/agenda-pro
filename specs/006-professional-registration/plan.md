# Implementation Plan: Cadastro e Gestão de Profissionais

**Branch**: `006-professional-registration` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-professional-registration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add team management to an existing workspace: an OWNER/ADMIN invites a professional by
e-mail (name, e-mail, role, job title); the invite is a tokenized, 7-day-expiry link sent via
Resend. Accepting the link adds the invitee to the workspace as an **active** membership with
the invited role and job title — directly if they already have an account, or after completing
signup if they don't (the tokenized link doubles as e-mail proof, so the new member lands in
the workspace immediately on first login, satisfying SC-002). The professionals screen
(`/dashboard/profissionais`) lists members with status/role/job-title/photo and lets
OWNER/ADMIN edit role, status, and job title under server-enforced rules (ADMIN can't touch an
OWNER; the last OWNER can't be demoted/deactivated). A global user profile photo (Supabase
Storage, JPEG/PNG ≤5 MB, initials-avatar fallback) and an empty "Serviços" placeholder section
round out the screen. The data model ships the professional↔service relationship now (a minimal
`Service` model + `ProfessionalService` join) so the future services module needs no schema
migration for that link.

This is the **first feature with interactive client-side server-data**, so it introduces the
app-wide React Query provider (Constitution VII) and the first validated **Route Handlers**
(Constitution III). Tenant context is always re-derived from
`session.user.activeWorkspaceId` server-side — never from the request body (Constitution I).

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.9 (App Router), React 19.2.4

**Primary Dependencies**: NextAuth 5.0.0-beta.31 (`auth.ts`/`auth.config.ts`, JWT session +
`unstable_update`), Prisma 7.8 (`@prisma/client`, `@prisma/adapter-pg`), Zod 4, Resend 6
(transactional e-mail, already wired in `lib/email/`), `@tanstack/react-query` 5 (already a
dependency — provider added by this feature), Zustand 5 (only if a client-only UI store is
needed for the invite dialog; default to `useState`), shadcn/ui + Tailwind 4, `lucide-react`.
**New dependency**: `@supabase/supabase-js` (server-only Storage client for photo upload, P3).

**Storage**: PostgreSQL via Supabase, accessed exclusively through Prisma. New: `MembershipStatus`
+ `InviteStatus` enums, `WorkspaceInvite`, `Service`, `ProfessionalService` models; new columns
`status` + `jobTitle` on `WorkspaceMembership`. Profile images stored in a Supabase Storage
`avatars` bucket; public URL persisted on `User.image` (see `data-model.md`, `research.md` §3).

**Testing**: No automated test suite exists in this repo and the spec does not request one;
verification is manual per `quickstart.md` (Constitution: "Tests are written when explicitly
requested by the feature spec"). The tenant-isolation and last-OWNER/role-guard paths are the
priority manual scenarios.

**Target Platform**: Server-rendered web app (Next.js Server Components for initial data +
Route Handlers for mutations), NextAuth-protected `/dashboard` routes; one public tokenized
route (`/convite/[token]`) reachable while logged out.

**Project Type**: Web application — single Next.js project (no separate frontend/backend).

**Performance Goals**: No high-traffic surface. Authenticated, low-volume management screens;
default Next.js SSR + React Query caching is sufficient. UX targets only: SC-001 (invite e-mail
within 2 min — bounded by Resend delivery, async), SC-002 (full invite→signup→login→access
under 5 min), SC-004 (list reflects changes without manual reload — React Query invalidation).

**Constraints**: Must keep `session.strategy: "jwt"` (Credentials provider requirement) and must
not introduce `middleware.ts` (none exists — `auth.config.ts` `authorized` callback already
gates `/dashboard`; the public `/convite/[token]` route must be reachable while logged out, so
it must NOT live under `/dashboard`). Tenant id (`workspaceId`) MUST be re-derived from the
session, never trusted from the request body (Constitution I/VIII). All Route Handler input
validated with Zod, typed JSON responses, no `any` on request/response/Prisma boundaries
(Constitution III). Client-side reads/mutations via React Query only; secrets (Supabase service
role key, Resend key) stay in server-only env vars (Constitution V).

**Scale/Scope**: ~1 reworked screen (`/dashboard/profissionais`), 1 new public route
(`/convite/[token]`) + its accept Server Action, ~6 Route Handlers (list members, update member,
create/list/resend/cancel invite, upload photo), 3 new Prisma models + 2 enums + 2 new columns +
1 migration, React Query provider setup, a signup-flow tweak to honor an `invite` token, and an
update to `resolveWorkspaceRoute`/membership reads to filter by `status = ACTIVE`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Tenant Isolation by Default (NON-NEGOTIABLE)** — PASS by design. Every professional
  Route Handler resolves the tenant from `session.user.activeWorkspaceId` server-side and
  re-verifies the caller's membership before any read/write; a `workspaceId`/`membershipId`/
  `inviteId` in the request body or params is treated as untrusted and re-scoped to the session's
  workspace. New tenant-scoped tables (`WorkspaceInvite`, `Service`) carry `workspaceId` + index;
  `ProfessionalService` joins through workspace-scoped rows. The invite-accept path re-derives the
  workspace from the validated token, never from client input. See `contracts/`.
- **II. Server-First Next.js Architecture** — PASS. The professionals list and the invite-accept
  screen are Server Components that fetch initial data at request time; the client list/dialog
  components receive it as props / React Query `initialData`. Only interactive leaves
  (invite dialog, role/status selects, photo uploader) are `"use client"`. No `useEffect`+`fetch`
  for initial data. App Router primitives only (route group, dynamic segment, Route Handlers).
- **III. Type-Safe, Validated API Routes** — PASS / GATE FOR IMPLEMENTATION. This feature adds the
  project's first `app/api/**/route.ts` handlers: each validates body/params with Zod before
  logic, resolves session + tenant context first, returns a consistent typed JSON shape for
  success and error, delegates logic to `lib/workspace/*` services, and never uses `any`.
  Contracts in `contracts/`.
- **IV. Design System & UI Consistency (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. The
  reworked professionals screen, the invite dialog, the member row/edit controls, the photo
  uploader, and the invite-accept screen MUST go through the `frontend-design` skill before
  implementation. Reuse shadcn/ui (Table/Card, Dialog, Select, Badge, Avatar, Input, Button,
  Label); add only missing shadcn primitives (Dialog/Select/Table/Avatar/DropdownMenu/Sonner)
  via the shadcn CLI, consuming existing tokens — no hardcoded colors/spacing.
- **V. Authentication & Authorization via NextAuth** — PASS. NextAuth remains the only session
  mechanism. All Route Handlers and the accept flow resolve the session server-side; role checks
  (OWNER/ADMIN gates, ADMIN-can't-edit-OWNER, last-OWNER guard) are enforced server-side per
  request, never inferred from client state. Supabase service-role key and Resend key live in
  server-only env vars.
- **VI. Prisma-Mediated Database Access & Migrations** — PASS / GATE FOR IMPLEMENTATION. All
  schema changes ship as one `prisma migrate dev` migration in the same change; new tenant-scoped
  tables include the `workspaceId` FK + index. No dashboard edits. The `Service` model is a
  minimal forward-compatible placeholder (additive columns later, no destructive migration).
- **VII. Component Architecture, Separation of Concerns & Client State** — PASS / GATE FOR
  IMPLEMENTATION. One component per file; the member list, member row, invite dialog, role/status
  controls, and photo uploader are separate files. Business logic (authorization rules,
  last-OWNER guard, invite token lifecycle) lives in `lib/workspace/*` services, not in JSX or
  handlers. Client-side mutations use React Query hooks (`use*`) — no `useEffect`+`fetch`; server
  data is never copied into Zustand. The new `QueryClientProvider` is added app-wide.
- **VIII. Strictly Prohibited Antipatterns (NON-NEGOTIABLE)** — PASS. No trusting client
  `workspaceId`; no `useEffect`+`fetch` for server data; no Pages Router; Prisma only on the
  server; `"use client"` only where interactive; no custom duplicates of shadcn primitives; no
  hardcoded tokens; Route Handlers return typed errors (never a generic 200); no `any`/unnarrowed
  `unknown`; no secrets in `NEXT_PUBLIC_*`.
- **IX. Mobile-First Development (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. The professionals
  list (likely a card list on mobile, table on `md:+`), invite dialog, and accept screen MUST be
  designed/validated at the smallest viewport first via the `frontend-design` invocation, then
  enhanced upward. No horizontal scroll to reach primary actions (invite, edit).
- **X. User-Facing Language (pt-BR) (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. All screen copy,
  labels, validation/error messages, empty states, toasts, and the invite e-mail (subject + body)
  ship in pt-BR from the start, matching the existing `(auth)`/`(workspace)` tone and the existing
  `sendVerificationEmail` style.

No violations require the Complexity Tracking table. The new `@supabase/supabase-js` dependency
and the React Query provider are introductions justified inline in `research.md`, not deviations
from a principle.

## Project Structure

### Documentation (this feature)

```text
specs/006-professional-registration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── invites-api.md
│   ├── members-api.md
│   ├── member-photo-api.md
│   └── invite-accept.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                       # + MembershipStatus, InviteStatus enums;
│                                        #   + WorkspaceMembership.status/.jobTitle;
│                                        #   + WorkspaceInvite, Service, ProfessionalService models
└── migrations/<ts>_add_professionals/migration.sql   # new migration

types/
└── next-auth.d.ts                      # unchanged (activeWorkspaceId already present)

app/
├── providers.tsx                       # NEW: "use client" QueryClientProvider wrapper
├── layout.tsx                          # edited: wrap children in <Providers>
├── actions/
│   └── invite.ts                       # NEW: acceptInvite Server Action (tokenized accept)
├── (workspace)/
│   └── convite/
│       └── [token]/
│           └── page.tsx                # NEW: public invite-accept screen (logged out reachable)
├── (auth)/
│   └── signup/                         # edited: carry ?invite=<token> through signup → verify
└── dashboard/
    └── profissionais/
        └── page.tsx                    # edited: Server Component, fetches members + invites,
                                        #   renders ProfessionalsView with initialData
app/api/
└── workspace/
    ├── members/route.ts                # NEW: GET list members (active + inactive)
    ├── members/[membershipId]/route.ts # NEW: PATCH role/status/jobTitle
    ├── members/[membershipId]/photo/route.ts  # NEW: POST multipart photo upload
    └── invites/route.ts                # NEW: GET list, POST create invite
    └── invites/[inviteId]/route.ts     # NEW: POST resend, DELETE cancel

lib/
├── supabase/
│   └── storage.ts                      # NEW: server-only Supabase Storage client + uploadAvatar
├── email/
│   └── send-invite-email.ts            # NEW: pt-BR invite e-mail via Resend (mirrors verification)
├── workspace/
│   ├── workspace-service.ts            # edited: filter memberships by status = ACTIVE
│   ├── authorization.ts                # NEW: requireWorkspaceRole(userId, workspaceId, roles)
│   ├── member-service.ts               # NEW: list/update members + last-OWNER & ADMIN/OWNER guards
│   └── invite-service.ts               # NEW: create/resend/cancel/accept, token hash + 7d expiry
└── validation/
    └── professional.ts                 # NEW: Zod schemas (CreateInvite, UpdateMember, photo)

components/
├── professionals/
│   ├── professionals-view.tsx          # NEW: "use client" list container (React Query, initialData)
│   ├── professional-list-item.tsx      # NEW: member card/row (mobile card, md:+ row)
│   ├── invite-professional-dialog.tsx  # NEW: invite form dialog (shadcn Dialog + form)
│   ├── member-role-select.tsx          # NEW: role editor (server-guarded)
│   ├── member-status-toggle.tsx        # NEW: active/inactive toggle
│   ├── professional-photo-uploader.tsx # NEW: upload control (type/size validation)
│   ├── professional-avatar.tsx         # NEW: photo or initials fallback
│   ├── pending-invites-list.tsx        # NEW: pending/expired invites with resend/cancel
│   └── professional-services-section.tsx # NEW: empty "Serviços" placeholder
└── invite/
    └── accept-invite-card.tsx          # NEW: accept screen body (server-rendered state + action)

hooks/
└── professionals/                      # NEW: React Query hooks
    ├── use-members.ts                  # useMembers, useUpdateMember
    ├── use-invites.ts                  # useInvites, useCreateInvite, useResendInvite, useCancelInvite
    └── use-upload-member-photo.ts      # photo upload mutation
```

**Structure Decision**: Single Next.js project (App Router) — the existing repo shape
(`app/`, `components/`, `lib/`, `prisma/` at root). The public invite-accept route lives under
the existing `(workspace)` route group (NOT under `/dashboard`) so it is reachable while logged
out, matching how `auth.config.ts` only gates `/dashboard`. The professionals screen stays at
its existing `app/dashboard/profissionais/` path. All tenant-scoped DB logic and authorization
rules are isolated in `lib/workspace/*` services (Constitution VII) and consumed by thin,
validated Route Handlers (Constitution III); the client uses React Query hooks against those
handlers (Constitution VII). A new `app/providers.tsx` supplies the app-wide `QueryClient`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no violations. (The `@supabase/supabase-js` dependency and React Query provider are
new introductions justified in `research.md`, not principle deviations.)
