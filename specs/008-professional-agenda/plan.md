# Implementation Plan: Agenda de Profissionais

**Branch**: `008-professional-agenda` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-professional-agenda/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Turn the placeholder `/dashboard/agenda` screen into a working per-professional day agenda,
Teams-style: a vertical time grid for one professional at a time, with create / reschedule / cancel
operations and a workspace-wide business-hours configuration. Delivered in six vertical slices
matching the spec's user stories:

1. **View a professional's day (P1, US1)** — `/dashboard/agenda` renders a 15-minute time grid for
   the selected day, with each `SCHEDULED`/`COMPLETED`/`NO_SHOW` appointment positioned by start
   time and duration, showing client, service and start/end. Day navigation (prev / next / today)
   and an appointment detail view.
2. **ADMIN/OWNER professional switcher (P1, US2)** — a professional selector visible only to
   OWNER/ADMIN that swaps whose agenda is shown; MEMBER sees only their own agenda and no selector.
   The server re-derives role and blocks a MEMBER from reading/writing another professional's
   agenda regardless of what the client sends (FR-005/FR-007/FR-025).
3. **Create an appointment (P1, US3)** — click a free slot → dialog pre-filled with the start time;
   pick an **active** service (duration auto-computes the end), enter client name + phone (free
   text, no persistent customer record), save. Blocks past times, closed days/out-of-hours,
   inactive services, inactive professionals, and time overlaps (FR-008…FR-014).
4. **Reschedule (P2, US4)** — move a `SCHEDULED` appointment to a new free time (and, for
   OWNER/ADMIN, to a different professional), re-applying the conflict/past/hours rules and writing
   a history event with the previous and new times (FR-015…FR-018).
5. **Cancel (P2, US5)** — cancel a `SCHEDULED` appointment with an explicit confirmation and an
   optional reason, freeing the slot and recording the reason + timestamp in history (FR-019…FR-023).
6. **Business hours (P3, US6)** — OWNER/ADMIN configure one workspace-wide open/close time and the
   open weekdays; the grid and the create/reschedule validations respect it. With no explicit
   config the system applies a default of 08:00–18:00 every day (FR-026…FR-028).

This feature reuses the infrastructure established by features 006/007: the Route Handler pattern
(`resolveTenant` + `requireWorkspaceRole` + `errorResponse` in `lib/workspace/api-context.ts` /
`authorization.ts`), Zod validation, `lib/workspace/*` services, React Query hooks against
`/api/workspace/*`, shadcn/ui + design tokens, and the `<screen>/page.tsx` Server-Component guard
(session + ACTIVE membership) used by `profissionais`/`servicos`. Tenant context is always
re-derived from `session.user.activeWorkspaceId` server-side — never from the request body
(Constitution I). Professional and service selection reuse `listMembers` (006) and `listServices`
(007). **No new runtime dependency** is introduced (see `research.md` §1/§2).

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.9 (App Router), React 19.2.4

**Primary Dependencies**: NextAuth 5.0.0-beta.31 (server-side session via `auth()`), Prisma 7.8
(`@prisma/client`, `@prisma/adapter-pg`), Zod 4, `@tanstack/react-query` 5, shadcn/ui + Tailwind 4,
`lucide-react`, `sonner` (toasts). **No new dependency** — date/time math uses native
`Date` + `Intl.DateTimeFormat` (pt-BR locale), no date library (see `research.md` §1).

**Storage**: PostgreSQL via Supabase, Prisma-only. Adds three new tenant-scoped models —
`Appointment`, `AppointmentEvent` (history), `WorkspaceBusinessHours` — and one enum
`AppointmentStatus { SCHEDULED, COMPLETED, CANCELLED, NO_SHOW }`. One additive migration. The
migration also enables the `btree_gist` extension and adds a **partial `EXCLUDE` constraint** on
`Appointment` so overlapping `SCHEDULED` slots for the same professional are rejected at the
database level (raw SQL — Prisma can't express it), the structural guarantee behind SC-004
(see `research.md` §3). Appointment `startsAt`/`endsAt` are stored as workspace wall-clock instants
(see `research.md` §4); business hours store open/close as minutes-from-midnight and open weekdays
as an `Int[]` (see `data-model.md`).

**Testing**: No automated test suite exists and the spec does not request one; verification is
manual per `quickstart.md` (Constitution: "Tests are written when explicitly requested"). Priority
manual scenarios: tenant isolation + MEMBER cross-professional block (SC-005), overlap prevention
under a simulated race (SC-004), history completeness on reschedule/cancel (SC-006), and
out-of-hours/closed-day blocking (SC-007).

**Target Platform**: Server-rendered web app — Server Component for initial agenda data, validated
Route Handlers for reads/mutations, NextAuth-protected `/dashboard` routes. No public surface added
(the public booking page is explicitly a separate future surface — spec Assumptions).

**Project Type**: Web application — single Next.js project (no separate frontend/backend).

**Performance Goals**: Authenticated, low-volume management screen. SSR + React Query caching is
sufficient. UX targets only: SC-001 (create in < 1 min), SC-002 (grid reflects a day/professional
switch in ≤ 2 s — React Query cache + invalidation), SC-003 (switch professionals in ≤ 2
interactions).

**Constraints**: `workspaceId` MUST be re-derived from the session, never trusted from request
body/params (Constitution I/VIII). Every appointment/business-hours Route Handler validates input
with Zod, resolves session + tenant first, returns typed JSON for success and error, and uses no
`any` on request/response/Prisma boundaries (Constitution III). Reading or writing another
professional's agenda requires a server-side OWNER/ADMIN re-check per request; a MEMBER is confined
to their own membership (FR-005/FR-007/FR-025). Every appointment write re-verifies that the target
membership **and** the target service resolve within the session workspace before writing
(cross-tenant guard). Conflict, past-time, and business-hours rules are enforced server-side on both
create and reschedule; the client-side versions are UX niceties only.

**Scale/Scope**: 1 reworked screen (`/dashboard/agenda`) + 1 business-hours section on
`/dashboard/configuracoes`, ~3 Route Handler files (~7 handlers), 3 new `lib/workspace/*` services
(appointment, appointment-scheduling rules helper, business-hours) + 1 pure `lib/agenda/*` grid/time
helper, 1 new `lib/validation/appointment.ts` + `lib/validation/business-hours.ts`, 3 new models +
1 enum + 1 migration (incl. raw SQL for the exclude constraint), and a set of
`components/agenda/*` + `hooks/agenda/*` React Query hooks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Tenant Isolation by Default (NON-NEGOTIABLE)** — PASS by design. Every appointment and
  business-hours Route Handler resolves the workspace from `session.user.activeWorkspaceId` and
  re-verifies membership before any read/write. An `appointmentId`/`membershipId`/`serviceId` in the
  body or params is untrusted: reads/writes are scoped `where: { workspaceId }`; appointment writes
  re-check that the target membership **and** service both resolve within the session workspace
  before inserting/updating. All three new models carry `workspaceId` + an index (Appointment,
  AppointmentEvent via appointment, WorkspaceBusinessHours `@unique(workspaceId)`). See `contracts/`.
- **II. Server-First Next.js Architecture** — PASS. `/dashboard/agenda` is a Server Component that
  resolves session + role and fetches the initial day's appointments, the professional list (for
  OWNER/ADMIN), active services and business hours at request time, passing them as React Query
  `initialData`; only interactive leaves (grid interactions, day navigator, professional selector,
  create/reschedule/cancel dialogs) are `"use client"`. No `useEffect`+`fetch` for initial data.
  App Router primitives only.
- **III. Type-Safe, Validated API Routes** — GATE FOR IMPLEMENTATION. Each new
  `app/api/workspace/appointments/**` and `.../business-hours` handler validates body/params/query
  with Zod (`lib/validation/appointment.ts`, `lib/validation/business-hours.ts`) before logic,
  resolves tenant first via `resolveTenant`, returns the existing typed JSON shape
  (`{ ... }` / `{ error }`), delegates to `lib/workspace/*` services, and never uses `any`.
  Contracts in `contracts/`.
- **IV. Design System & UI Consistency (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. The time grid,
  appointment block, day navigator, professional selector, create/reschedule dialog, appointment
  detail view, cancel confirmation, and business-hours form MUST go through the `frontend-design`
  skill before implementation. Reuse shadcn/ui already vendored (Dialog, Select, Popover/Command,
  Button, Input, Label, Textarea, Badge, Card, AlertDialog, Sonner); add no custom duplicates;
  consume existing tokens — no hardcoded colors/spacing. The grid is a bespoke composition (no
  shadcn equivalent) but is built from tokens + primitives (see `research.md` §5).
- **V. Authentication & Authorization via NextAuth** — PASS. NextAuth remains the only session
  mechanism; the Server Component and all handlers resolve the session server-side. The
  MEMBER-vs-OWNER/ADMIN distinction (own agenda only vs. any professional) is enforced server-side
  per request via `requireWorkspaceRole` + an explicit "target ≠ self ⇒ require OWNER/ADMIN" check,
  never inferred from client state (FR-025). No new secrets.
- **VI. Prisma-Mediated Database Access & Migrations** — GATE FOR IMPLEMENTATION. The three new
  models + enum ship as one `prisma migrate dev` migration in the same change; each tenant-scoped
  table keeps `workspaceId` + index. The `btree_gist` extension + partial `EXCLUDE` constraint are
  appended as raw SQL in that migration file (called out explicitly, additive-only, no drops). No
  dashboard edits.
- **VII. Component Architecture, Separation of Concerns & Client State** — GATE FOR IMPLEMENTATION.
  One component per file; the grid, hour rail, appointment block, day navigator, professional
  selector, appointment dialog, appointment-detail panel, cancel dialog, and business-hours form are
  separate files. Business logic (slot/position math, conflict/hours/past-time validation, duration
  → end-time, DTO shaping) lives in `lib/agenda/*` + `lib/workspace/*`, not in JSX or handlers.
  Client reads/mutations use React Query hooks (`use*`); server data is never copied into Zustand —
  the selected day/professional and open-dialog state are local `useState` (or a small Zustand UI
  store if they must be shared across sibling panels — UI state only, not server data).
- **VIII. Strictly Prohibited Antipatterns (NON-NEGOTIABLE)** — PASS. No trusting client
  `workspaceId`; no `useEffect`+`fetch` for server data; no Pages Router; Prisma server-only;
  `"use client"` only on interactive leaves; no custom shadcn duplicates; no hardcoded tokens;
  typed error responses (never a generic 200 — the overlap `EXCLUDE` violation maps to a typed 409);
  no `any`/unnarrowed `unknown`; no secrets in `NEXT_PUBLIC_*`.
- **IX. Mobile-First Development (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. The agenda grid MUST
  be designed/validated at the smallest viewport first via the `frontend-design` invocation, then
  enhanced upward: a single-column vertical time grid on mobile (professional selector + day
  navigator stacked above), progressively widened on `md:+`. Dialogs use the mobile-friendly shadcn
  Dialog/Sheet composition. No horizontal scroll to reach the primary actions (novo agendamento,
  navegar dia, trocar profissional).
- **X. User-Facing Language (pt-BR) (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. All screen copy,
  field labels/placeholders, validation/error messages (conflict, past time, closed day,
  out-of-hours, inactive service/professional), empty states, status labels (Agendado, Concluído,
  Cancelado, Não compareceu), confirmations and toasts ship in pt-BR from the start; dates/times
  formatted with `Intl` pt-BR locale. Matches existing `professionals`/`servicos` tone.

No violations require the Complexity Tracking table. The one non-obvious addition — a raw-SQL
`EXCLUDE` constraint — is justified in `research.md` §3 as the structural guarantee behind SC-004
and is preferred over a purely application-level check that cannot survive the concurrent-write edge
case; it adds no dependency and no new architectural primitive.

## Project Structure

### Documentation (this feature)

```text
specs/008-professional-agenda/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── appointments-api.md
│   └── business-hours-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                       # + AppointmentStatus enum;
│                                        #   + Appointment, AppointmentEvent, WorkspaceBusinessHours;
│                                        #   + Workspace.appointments/.businessHours relations
└── migrations/<ts>_professional_agenda/migration.sql
                                        # new additive migration (models + btree_gist EXCLUDE constraint raw SQL)

app/
├── dashboard/
│   ├── agenda/
│   │   └── page.tsx                    # EDITED: Server Component — session+role guard, fetches
│   │                                    #   day appointments + professionals + services + hours, renders AgendaView
│   └── configuracoes/
│       └── page.tsx                    # EDITED: mount the BusinessHoursSection (OWNER/ADMIN only)
└── api/
    └── workspace/
        ├── appointments/route.ts           # NEW: GET list (?professionalId&date), POST create
        ├── appointments/[appointmentId]/route.ts       # NEW: GET detail, PATCH reschedule/status, DELETE(=cancel)
        └── business-hours/route.ts         # NEW: GET current (or default), PUT upsert

lib/
├── workspace/
│   ├── appointment-service.ts          # NEW: list/detail/create/reschedule/cancel/setStatus (tenant-scoped), AppointmentDTO, AppointmentEventDTO
│   └── business-hours-service.ts       # NEW: get (with default fallback) / upsert business hours, BusinessHoursDTO
├── agenda/
│   ├── scheduling-rules.ts             # NEW: pure — overlap check, past-time check, within-business-hours check, duration→end
│   └── time-grid.ts                    # NEW: pure — build day slots (15-min), position/height for an appointment, day nav helpers
└── validation/
    ├── appointment.ts                  # NEW: Zod (CreateAppointment, RescheduleAppointment, SetStatus, CancelAppointment, list query)
    └── business-hours.ts               # NEW: Zod (UpsertBusinessHours: openMinutes/closeMinutes/openWeekdays)

components/
├── agenda/
│   ├── agenda-view.tsx                 # NEW: "use client" container (React Query initialData; owns selected day+professional)
│   ├── agenda-toolbar.tsx              # NEW: day navigator (prev/next/hoje) + date label
│   ├── agenda-professional-select.tsx  # NEW: OWNER/ADMIN-only professional switcher (shadcn Select)
│   ├── agenda-time-grid.tsx            # NEW: the vertical 15-min grid (hour rail + slot click surface)
│   ├── agenda-appointment-block.tsx    # NEW: one positioned appointment (client, service, time, status color)
│   ├── appointment-form-dialog.tsx     # NEW: create/reschedule dialog (service+client fields, useState)
│   ├── appointment-detail-dialog.tsx   # NEW: detail view + actions (reschedule, cancel, mark status)
│   └── appointment-cancel-dialog.tsx   # NEW: confirm cancel + optional reason (shadcn AlertDialog)
└── settings/
    └── business-hours-section.tsx      # NEW: open/close time + open weekdays form (OWNER/ADMIN)

hooks/
└── agenda/                             # NEW: React Query hooks
    ├── use-appointments.ts             # useAppointments(day, professionalId), useCreate/useReschedule/useCancel/useSetStatus
    └── use-business-hours.ts           # useBusinessHours, useUpdateBusinessHours
```

**Structure Decision**: Single Next.js project (App Router), reusing the existing repo shape
(`app/`, `components/`, `lib/`, `hooks/`, `prisma/`). The agenda lives at the existing authenticated
route `app/dashboard/agenda/` (same guard pattern as `app/dashboard/servicos/page.tsx`). Appointment
routes are grouped under `app/api/workspace/appointments/*`; the `professionalId` a caller wants to
view is a **query param** on the list route, re-validated server-side against the caller's role
(self-only for MEMBER). Business hours are a single workspace-scoped resource at
`app/api/workspace/business-hours` (GET/PUT). All tenant-scoped DB logic and scheduling rules live in
`lib/workspace/*` + pure `lib/agenda/*` helpers (Constitution VII), consumed by thin validated Route
Handlers (Constitution III); the client uses React Query hooks against those handlers. The
business-hours editor is folded into the existing `/dashboard/configuracoes` screen rather than a new
route, matching the spec's framing of it as a workspace setting.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no violations. No new dependency and no new architectural primitive are introduced. The
only unusual element, a raw-SQL Postgres `EXCLUDE` constraint (`btree_gist`), is a database
feature — not a new abstraction — and is the structural mechanism that makes SC-004 (0% overlap)
true under concurrency rather than merely tested for; it is documented in `research.md` §3.
