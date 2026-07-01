# Implementation Plan: Cadastro e Gestão de Serviços

**Branch**: `007-service-catalog` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-service-catalog/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Turn the two placeholder models shipped by feature 006 (`Service`, `ProfessionalService`) into a
working service catalog. This feature delivers three slices:

1. **Catalog CRUD (P1)** — a new authenticated screen `/dashboard/servicos` where OWNER/ADMIN
   create services (nome, descrição opcional, duração em minutos, preço padrão), edit them, and
   toggle status ativo/inativo. No hard delete — status only, preserving associations
   (FR-009). List shows nome, duração, preço padrão, status.
2. **Professional↔service association (P2)** — replace the empty "Serviços" placeholder in the
   professional profile (`components/professionals/professional-services-section.tsx`) with a real
   selector that associates **active** services to a member using the default price, and removes
   associations. Inactive-but-already-associated services stay listed, flagged inativo (FR-014).
3. **Per-professional custom price (P3)** — on an existing association, enable a custom price that
   overrides the default for that professional only; revert restores the default. Default-price
   users always reflect the current catalog price (FR-018); custom-price users are unaffected by
   catalog price changes (FR-003 / SC-004).

This feature reuses the infrastructure introduced by 006: the workspace Route Handler pattern
(`resolveTenant` + `requireWorkspaceRole` + `errorResponse` in `lib/workspace/api-context.ts` /
`authorization.ts`), Zod validation, `lib/workspace/*` services, React Query hooks against
`/api/workspace/*`, and shadcn/ui + design tokens. Tenant context is always re-derived from
`session.user.activeWorkspaceId` server-side — never from the request body (Constitution I). No
new runtime dependency is introduced.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.9 (App Router), React 19.2.4

**Primary Dependencies**: NextAuth 5.0.0-beta.31 (server-side session via `auth()`), Prisma 7.8
(`@prisma/client`, `@prisma/adapter-pg`), Zod 4, `@tanstack/react-query` 5, shadcn/ui + Tailwind 4,
`lucide-react`, `sonner` (toasts). **No new dependency** — all patterns already exist in the repo.

**Storage**: PostgreSQL via Supabase, Prisma-only. This feature **extends existing models** rather
than adding tables: `Service` gains `description`, `durationMinutes`, `defaultPrice`, `status`,
`updatedAt`; `ProfessionalService` gains `useCustomPrice`, `customPrice`. One new enum
`ServiceStatus { ACTIVE, INACTIVE }`. One additive migration. Both models are empty placeholders
from feature 006, so adding NOT NULL columns is safe (see `research.md` §2). Money is stored as
`Decimal @db.Decimal(10, 2)` and exposed as `number` (reais) in DTOs (see `research.md` §1).

**Testing**: No automated test suite exists and the spec does not request one; verification is
manual per `quickstart.md` (Constitution: "Tests are written when explicitly requested"). Priority
manual scenarios: tenant isolation on every service route, default-vs-custom price resolution
(SC-004), and association survival when a service is deactivated (SC-005).

**Target Platform**: Server-rendered web app — Server Components for initial page data, validated
Route Handlers for mutations, NextAuth-protected `/dashboard` routes. No public surface added.

**Project Type**: Web application — single Next.js project (no separate frontend/backend).

**Performance Goals**: No high-traffic surface. Authenticated, low-volume management screens; SSR +
React Query caching is sufficient. UX targets only: SC-001 (create a service in <1 min), SC-002
(list reflects create/edit without manual reload — React Query invalidation), SC-003 (associate a
service in ≤3 interactions).

**Constraints**: Tenant id (`workspaceId`) MUST be re-derived from the session, never trusted from
request body/params (Constitution I/VIII). Every service/association Route Handler validates input
with Zod, resolves session + tenant first, returns typed JSON for success and error, no `any` on
request/response/Prisma boundaries (Constitution III). Only OWNER/ADMIN may mutate the catalog and
associations; any ACTIVE member may read (mirrors 006). Association writes MUST re-verify that both
the target membership and the target service belong to the session's workspace before writing the
join row (cross-tenant guard). Custom price and default price share the same validation (≥ 0).

**Scale/Scope**: 1 new screen (`/dashboard/servicos`) + 1 reworked section (professional profile
"Serviços"), ~4 Route Handler files (~7 handlers), 2 new `lib/workspace/*` services + 1 pricing
helper, 1 new `lib/validation/service.ts`, ~2 model edits + 1 enum + 1 migration, a sidebar nav
entry, and a set of `components/services/*` + `hooks/services/*` React Query hooks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Tenant Isolation by Default (NON-NEGOTIABLE)** — PASS by design. Every service Route
  Handler resolves the workspace from `session.user.activeWorkspaceId` and re-verifies membership
  before any read/write. A `serviceId`/`membershipId` in params is untrusted: catalog updates are
  scoped `where: { id, workspaceId }`; association writes re-check that both the membership and the
  service resolve **within the same session workspace** before inserting the join row. `Service`
  already carries `workspaceId` + index; `ProfessionalService` reaches the tenant through both its
  membership and its service. See `contracts/`.
- **II. Server-First Next.js Architecture** — PASS. `/dashboard/servicos` and the professional
  profile are Server Components fetching initial data at request time and passing it as React Query
  `initialData`; only interactive leaves (service form dialog, status toggle, association selector,
  custom-price control) are `"use client"`. No `useEffect`+`fetch` for initial data. App Router
  primitives only.
- **III. Type-Safe, Validated API Routes** — GATE FOR IMPLEMENTATION. Each new
  `app/api/workspace/services/**` and `.../members/[id]/services/**` handler validates body/params
  with Zod (`lib/validation/service.ts`) before logic, resolves tenant first via `resolveTenant`,
  returns the existing typed JSON shape (`{ ... }` / `{ error }`), delegates to `lib/workspace/*`
  services, and never uses `any`. Contracts in `contracts/`.
- **IV. Design System & UI Consistency (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. The services
  list screen, the create/edit service dialog, the status toggle, the association selector, and the
  custom-price control MUST go through the `frontend-design` skill before implementation. Reuse
  shadcn/ui already vendored (Table, Card, Dialog, Select, Badge, Switch, Input, Label, Button,
  DropdownMenu, Sonner); add no custom duplicates; consume existing tokens — no hardcoded
  colors/spacing.
- **V. Authentication & Authorization via NextAuth** — PASS. NextAuth remains the only session
  mechanism; all handlers and the two Server Components resolve the session server-side. OWNER/ADMIN
  gates on every mutation are enforced server-side via `requireWorkspaceRole` per request, never
  inferred from client state. No new secrets.
- **VI. Prisma-Mediated Database Access & Migrations** — GATE FOR IMPLEMENTATION. The two model
  edits + new enum ship as one `prisma migrate dev` migration in the same change; `Service` keeps
  its `workspaceId` FK + index. No dashboard edits. Additive-only (no drops); safe because the
  placeholder tables are empty (see `research.md` §2).
- **VII. Component Architecture, Separation of Concerns & Client State** — GATE FOR IMPLEMENTATION.
  One component per file; the list, list item, service dialog, status toggle, association selector,
  associated-service row, and custom-price control are separate files. Business logic (price
  resolution, active-only filtering, validation) lives in `lib/workspace/*` + a `pricing` helper,
  not in JSX or handlers. Client mutations use React Query hooks (`use*`); server data is never
  copied into Zustand — the service dialog's local form state stays in `useState`.
- **VIII. Strictly Prohibited Antipatterns (NON-NEGOTIABLE)** — PASS. No trusting client
  `workspaceId`; no `useEffect`+`fetch` for server data; no Pages Router; Prisma server-only;
  `"use client"` only on interactive leaves; no custom shadcn duplicates; no hardcoded tokens;
  typed error responses (never a generic 200); no `any`/unnarrowed `unknown`; no secrets in
  `NEXT_PUBLIC_*`.
- **IX. Mobile-First Development (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. The services list
  (card list on mobile, table on `md:+`), the service dialog, and the association section MUST be
  designed/validated at the smallest viewport first via the `frontend-design` invocation, then
  enhanced upward. No horizontal scroll to reach primary actions (novo serviço, editar, associar).
- **X. User-Facing Language (pt-BR) (NON-NEGOTIABLE)** — GATE FOR IMPLEMENTATION. All screen copy,
  field labels/placeholders, validation/error messages, empty states, and toasts ship in pt-BR from
  the start; currency formatted as R$ (pt-BR locale). Matches existing `professionals`/`workspace`
  tone.

No violations require the Complexity Tracking table. This feature adds no new dependency and no new
architectural primitive — it consumes the infrastructure established by feature 006.

## Project Structure

### Documentation (this feature)

```text
specs/007-service-catalog/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── services-api.md
│   └── professional-services-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                       # + ServiceStatus enum;
│                                        #   + Service.description/.durationMinutes/.defaultPrice/.status/.updatedAt;
│                                        #   + ProfessionalService.useCustomPrice/.customPrice
└── migrations/<ts>_service_catalog/migration.sql   # new additive migration

app/
├── dashboard/
│   └── servicos/
│       └── page.tsx                    # NEW: Server Component, fetches services, renders ServicesView
└── api/
    └── workspace/
        ├── services/route.ts           # NEW: GET list, POST create
        ├── services/[serviceId]/route.ts   # NEW: PATCH edit fields / toggle status
        └── members/[membershipId]/services/route.ts        # NEW: GET member's associations, POST associate
        └── members/[membershipId]/services/[serviceId]/route.ts  # NEW: PATCH custom price, DELETE unassociate

lib/
├── workspace/
│   ├── service-catalog-service.ts      # NEW: list/create/update services (tenant-scoped), ServiceDTO
│   └── professional-service-service.ts # NEW: list/associate/unassociate/set-custom-price, AssociatedServiceDTO
├── pricing/
│   └── effective-price.ts              # NEW: pure helper — resolve effective price (default vs custom)
└── validation/
    └── service.ts                      # NEW: Zod schemas (CreateService, UpdateService, AssociateService, SetCustomPrice)

components/
├── services/
│   ├── services-view.tsx               # NEW: "use client" list container (React Query, initialData)
│   ├── service-list-item.tsx           # NEW: service card (mobile) / row (md:+): nome, duração, preço, status
│   ├── service-form-dialog.tsx         # NEW: create/edit service dialog (shadcn Dialog + form, useState)
│   ├── service-status-toggle.tsx       # NEW: ativo/inativo toggle (Switch, server-guarded)
│   └── service-price.tsx               # NEW: R$ formatter presentational helper (pt-BR locale)
└── professionals/
    └── professional-services-section.tsx  # EDITED: real association UI (was empty placeholder)
        (+ new child files below, one component per file)
    ├── professional-service-selector.tsx   # NEW: add active service to member (shadcn Select/Command)
    ├── professional-service-item.tsx        # NEW: associated row: name, effective price, inactive badge, remove
    └── professional-custom-price-control.tsx # NEW: enable/disable + value for per-professional price

hooks/
└── services/                           # NEW: React Query hooks
    ├── use-services.ts                 # useServices, useCreateService, useUpdateService
    └── use-professional-services.ts    # useProfessionalServices, useAssociateService,
                                        #   useUnassociateService, useSetCustomPrice

components/dashboard/                    # EDITED: add "Serviços" entry to the sidebar nav config
```

**Structure Decision**: Single Next.js project (App Router), reusing the existing repo shape
(`app/`, `components/`, `lib/`, `hooks/`, `prisma/`). The catalog lives at a new authenticated
route `app/dashboard/servicos/` (same guard pattern as `app/dashboard/profissionais/page.tsx`).
The association UI is folded into the **existing** professional profile section rather than a new
screen, because the spec places it there (US2/FR-011). Association routes are nested under
`members/[membershipId]/services` to make the tenant + membership scope explicit in the URL and to
reuse the member-scoped authorization pattern. All tenant-scoped DB logic and pricing rules live in
`lib/workspace/*` + `lib/pricing/*` (Constitution VII), consumed by thin validated Route Handlers
(Constitution III); the client uses React Query hooks against those handlers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no violations. No new dependency and no new architectural primitive are introduced;
this feature extends models and reuses the Route Handler / service / React Query patterns
established by feature 006.
