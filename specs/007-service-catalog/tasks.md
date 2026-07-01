---

description: "Task list for Cadastro e Gestão de Serviços (007-service-catalog)"
---

# Tasks: Cadastro e Gestão de Serviços

**Input**: Design documents from `/specs/007-service-catalog/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not requested by the spec/plan (manual validation via `quickstart.md` per Constitution: "Tests are written when explicitly requested"). No test tasks are generated.

**Organization**: Tasks are grouped by user story (US1 = P1 catalog CRUD, US2 = P2 professional association, US3 = P3 custom price) so each can be implemented and validated independently, in priority order.

**Pre-existing state (from feature 006, verified against the repo — do not recreate)**:
- `app/dashboard/servicos/page.tsx` exists as a static "Em breve." placeholder — replaced by T017.
- `lib/dashboard/nav-items.ts` already has the "Serviços" sidebar entry pointing at `/dashboard/servicos` — no task needed.
- `components/professionals/professional-services-section.tsx` exists as an empty placeholder, currently rendered **once** at the bottom of `components/professionals/professionals-view.tsx` (not per professional) — T026/T027 fix this.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps the task to US1/US2/US3
- Every task includes the exact file path(s) to touch

## Path Conventions

Single Next.js project (App Router) at the repository root: `app/`, `components/`, `lib/`, `hooks/`, `prisma/` — per `plan.md` Project Structure.

---

## Phase 1: Setup

**Purpose**: Pre-migration safety guard (research.md §2)

- [X] T001 Confirm the placeholder tables are empty before adding NOT NULL columns: run `SELECT count(*) FROM "Service";` and `SELECT count(*) FROM "ProfessionalService";` against the dev database (both must return `0`, per research.md §2). If either is non-zero, stop and add a backfill/default step before proceeding to T002.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + shared pure helpers that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `prisma/schema.prisma`, add enum `ServiceStatus { ACTIVE INACTIVE }`; extend `model Service` with `description String?`, `durationMinutes Int`, `defaultPrice Decimal @db.Decimal(10, 2)`, `status ServiceStatus @default(ACTIVE)`, `updatedAt DateTime @updatedAt`; extend `model ProfessionalService` with `useCustomPrice Boolean @default(false)`, `customPrice Decimal? @db.Decimal(10, 2)` — exact shape in `data-model.md` "Prisma schema delta"
- [X] T003 Run `npx prisma migrate dev --name service_catalog` to generate the additive migration in `prisma/migrations/`, then `npx prisma generate` to refresh `@prisma/client` types (depends on T002)
- [X] T004 [P] Add `SERVICE_STATUS_LABELS: Record<ServiceStatus, string>` (`ACTIVE: "Ativo"`, `INACTIVE: "Inativo"`) to `lib/workspace/labels.ts`, mirroring the existing `STATUS_LABELS` for `MembershipStatus` (depends on T003 for the `ServiceStatus` type)
- [X] T005 [P] Create `lib/pricing/effective-price.ts` exporting the pure helper `resolveEffectivePrice({ useCustomPrice, customPrice, defaultPrice })` returning `useCustomPrice && customPrice != null ? customPrice : defaultPrice` (research.md §4)
- [X] T006 [P] Create `components/services/service-price.tsx` — a small presentational component/formatter that renders a `number` as `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` (research.md §1, Constitution X)

**Checkpoint**: Schema, labels, pricing helper, and currency formatter ready — user story implementation can begin

---

## Phase 3: User Story 1 - Cadastrar e gerenciar o catálogo de serviços (Priority: P1) 🎯 MVP

**Goal**: OWNER/ADMIN create, edit, and activate/deactivate services on `/dashboard/servicos`; the list shows nome, duração, preço padrão, status.

**Independent Test**: Cadastrar um serviço com todos os campos, verificar que aparece na lista com status "ativo", editar e desativar o mesmo serviço.

### Implementation for User Story 1

- [X] T007 [P] [US1] Add `CreateServiceSchema` (`name` trim/min 1, `description` optional trim→nullable, `durationMinutes` `z.int().positive()`, `defaultPrice` `z.number().min(0)` max 2 decimals) and `UpdateServiceSchema` (all fields optional + `status` enum, `.refine` at least one field present) to `lib/validation/service.ts` — rules in `data-model.md` "Validation"
- [X] T008 [US1] Create `lib/workspace/service-catalog-service.ts` with `listServices(workspaceId, status?)`, `createService({ workspaceId, data })`, `updateService({ workspaceId, serviceId, data })`, all returning `ServiceDTO` (`serviceId, name, description, durationMinutes, defaultPrice: number, status, createdAt, updatedAt`) via a `toDTO` mapper that converts `Decimal` → `number` (research.md §1); `updateService` scopes the write `where: { id: serviceId, workspaceId }` and throws `WorkspaceAuthError(404, ...)` when not found (depends on T007)
- [X] T009 [US1] Implement `app/api/workspace/services/route.ts`: `GET` (any ACTIVE member, optional `?status=` filter) and `POST` (OWNER/ADMIN only, creates with `status: "ACTIVE"`) per `contracts/services-api.md`, following the `resolveTenant` → `requireWorkspaceRole` → Zod-validate → service → typed JSON pattern from `app/api/workspace/members/route.ts` (depends on T008)
- [X] T010 [US1] Implement `app/api/workspace/services/[serviceId]/route.ts`: `PATCH` (OWNER/ADMIN only, any subset of fields incl. `status`) per `contracts/services-api.md`; tenant-scoped update returns `404` for a `serviceId` from another workspace, never leaks (depends on T008)
- [X] T011 [P] [US1] Create `hooks/services/use-services.ts` with `useServices(initialData?)`, `useCreateService()`, `useUpdateService()` React Query hooks against `/api/workspace/services` and `/api/workspace/services/[serviceId]`, mirroring `hooks/professionals/use-members.ts` (invalidate the services query key on mutation success)
- [X] T012 [US1] Run the `frontend-design` skill for the services list screen (card list on mobile / table on `md:+`), the create/edit service dialog, and the status toggle — mobile-first per Constitution IV/IX — before building T013–T016
- [X] T013 [US1] Create `components/services/service-list-item.tsx` — service card (mobile) / row (`md:+`) showing nome, duração, preço padrão (via `service-price.tsx`), status badge (depends on T006, T012)
- [X] T014 [US1] Create `components/services/service-status-toggle.tsx` — ativo/inativo `Switch` calling `useUpdateService`, mirroring `components/professionals/member-status-toggle.tsx` (depends on T011, T012)
- [X] T015 [US1] Create `components/services/service-form-dialog.tsx` — shadcn `Dialog` + form (nome, descrição, duração, preço padrão) for both create and edit, client-side required-field validation with pt-BR messages before submit (SC-006), calling `useCreateService`/`useUpdateService` (depends on T011, T012)
- [X] T016 [US1] Create `components/services/services-view.tsx` — `"use client"` list container wiring `useServices` with server-provided `initialData`, "Novo serviço" trigger opening `ServiceFormDialog`, empty state, renders `ServiceListItem` + `ServiceStatusToggle` per service, no delete action anywhere (FR-009) (depends on T013, T014, T015)
- [X] T017 [US1] Replace the placeholder `app/dashboard/servicos/page.tsx` with a Server Component: `auth()` + ACTIVE-membership guard (mirror `app/dashboard/profissionais/page.tsx`), `listServices(workspaceId)`, render `<ServicesView callerRole initialServices />` (depends on T008, T016)

**Checkpoint**: `/dashboard/servicos` is fully functional and independently testable (catalog CRUD).

---

## Phase 4: User Story 2 - Associar serviços a um profissional (Priority: P2)

**Goal**: The "Serviços" section on each professional's row lets OWNER/ADMIN associate/remove **active** catalog services, using the default price; deactivated-but-associated services stay listed, flagged inativo.

**Independent Test**: Abrir o perfil de um profissional, associar um serviço ativo do catálogo, verificar que aparece na lista do profissional usando o preço padrão.

### Implementation for User Story 2

- [X] T018 [US2] Add `AssociateServiceSchema` (`{ serviceId: z.string().min(1) }`) to `lib/validation/service.ts` (same file as T007 — apply after US1's schemas exist)
- [X] T019 [US2] Create `lib/workspace/professional-service-service.ts` with `listAssociatedServices({ workspaceId, membershipId })` (joins live `Service.defaultPrice`, computes `effectivePrice` via `resolveEffectivePrice`, includes associations whose service is now `INACTIVE`, flagged via `serviceStatus` — reads do NOT filter by status) and `associateService({ workspaceId, membershipId, serviceId })` (re-verifies membership + service both resolve in `workspaceId` → `404`; rejects `INACTIVE` service → `400`; duplicate → `409`; creates row with `useCustomPrice: false, customPrice: null`) and `unassociateService({ workspaceId, membershipId, serviceId })`, all returning `AssociatedServiceDTO` (depends on T005, T018)
- [X] T020 [US2] Implement `app/api/workspace/members/[membershipId]/services/route.ts`: `GET` (any ACTIVE member) and `POST` (OWNER/ADMIN) per `contracts/professional-services-api.md` (depends on T019)
- [X] T021 [US2] Implement `app/api/workspace/members/[membershipId]/services/[serviceId]/route.ts` with a `DELETE` handler (OWNER/ADMIN, removes only the join row, works even when the service is `INACTIVE`) per `contracts/professional-services-api.md` (depends on T019)
- [X] T022 [P] [US2] Create `hooks/services/use-professional-services.ts` with `useProfessionalServices(membershipId, initialData?)`, `useAssociateService(membershipId)`, `useUnassociateService(membershipId)` React Query hooks (depends on T020, T021)
- [X] T023 [US2] Run the `frontend-design` skill for the professional-services association section (active-service selector, associated-service row with inativo badge) — mobile-first per Constitution IV/IX — before building T024–T026
- [X] T024 [US2] Create `components/professionals/professional-service-selector.tsx` — shadcn `Select`/`Command` listing only `ACTIVE` services not yet associated to this professional; on select, calls `useAssociateService` (depends on T022, T023)
- [X] T025 [US2] Create `components/professionals/professional-service-item.tsx` — associated-service row: nome, `effectivePrice` (via `service-price.tsx`), "inativo" badge when `serviceStatus === "INACTIVE"` (FR-014), remove button calling `useUnassociateService` (depends on T006, T022, T023)
- [X] T026 [US2] Rewrite `components/professionals/professional-services-section.tsx` to accept `membershipId` and `canManage` props, replacing the placeholder body with `useProfessionalServices(membershipId)`, `ProfessionalServiceSelector` (only when `canManage`), the list of `ProfessionalServiceItem`, and an empty state ("Nenhum serviço configurado.") (depends on T024, T025)
- [X] T027 [US2] In `components/professionals/professional-list-item.tsx`, render `<ProfessionalServicesSection membershipId={member.membershipId} canManage={canManage} />` per professional (each row gets its own section); remove the single top-level `<ProfessionalServicesSection />` call from `components/professionals/professionals-view.tsx` (depends on T026)

**Checkpoint**: US1 + US2 both functional — services can be created and associated to individual professionals.

---

## Phase 5: User Story 3 - Personalizar o preço de um serviço por profissional (Priority: P3)

**Goal**: On an existing association, OWNER/ADMIN can enable/disable a per-professional custom price that overrides the default; reverting restores the default and does not affect other professionals or the catalog.

**Independent Test**: Habilitar preço personalizado em uma associação profissional-serviço, salvar um valor diferente do padrão, depois reverter para o preço padrão.

### Implementation for User Story 3

- [X] T028 [US3] Add `SetCustomPriceSchema` (`{ useCustomPrice: z.boolean(), customPrice: z.number().min(0).optional() }` with `.refine`: `useCustomPrice === true` requires `customPrice`) to `lib/validation/service.ts` (same file as T007/T018 — apply after US2's schema exists)
- [X] T029 [US3] Add `setCustomPrice({ workspaceId, membershipId, serviceId, data })` to `lib/workspace/professional-service-service.ts`: re-verifies membership + service resolve in `workspaceId` → `404` if association missing; when `useCustomPrice: true` stores `customPrice` (≥ 0, accepted even if equal to `defaultPrice` — FR-015/FR-016); when `false` sets `customPrice: null` (FR-017, research.md §4); returns `AssociatedServiceDTO` (depends on T019, T028)
- [X] T030 [US3] Add a `PATCH` handler to `app/api/workspace/members/[membershipId]/services/[serviceId]/route.ts` (alongside the existing `DELETE` from T021), OWNER/ADMIN only, per `contracts/professional-services-api.md` (depends on T029)
- [X] T031 [P] [US3] Add `useSetCustomPrice(membershipId)` to `hooks/services/use-professional-services.ts` (depends on T030)
- [X] T032 [US3] Run the `frontend-design` skill for the per-professional custom-price control (enable/disable + value input) — mobile-first per Constitution IV/IX — before building T033
- [X] T033 [US3] Create `components/professionals/professional-custom-price-control.tsx` — enable/disable switch + price `Input` (shown when enabled), calling `useSetCustomPrice`; reverting clears the input back to displaying the current default (depends on T031, T032)
- [X] T034 [US3] Wire `ProfessionalCustomPriceControl` into `components/professionals/professional-service-item.tsx`, rendered only when `canManage` (depends on T033, T025)

**Checkpoint**: All three user stories independently functional — catalog CRUD, association, and per-professional pricing.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gate across all three stories (Constitution quality gate, quickstart.md "Done when")

- [X] T035 [P] Run `npx tsc --noEmit` and `npm run lint`; fix any type or lint errors introduced across `prisma/`, `lib/`, `app/api/workspace/services*`, `app/api/workspace/members/[membershipId]/services*`, `hooks/services/`, `components/services/`, `components/professionals/`
- [ ] T036 Execute the full `quickstart.md` walk-through: Scenario 1 (catalog CRUD), Scenario 2 (association + SC-005 deactivation survival), Scenario 3 (custom price + SC-004 propagation), and the tenant-isolation checks (cross-workspace `PATCH`/`POST` → `404`, `INACTIVE` association → `400`, duplicate → `409`, non-OWNER/ADMIN mutation → `403`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first (DB guard before any schema change)
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only — can start immediately after Phase 2
- **User Story 2 (Phase 4)**: Depends on Foundational; reuses `service-price.tsx` (T006) and `resolveEffectivePrice` (T005) from Foundational. Not code-dependent on US1, but shares `lib/validation/service.ts` (T007/T018 same file) — implement after US1 if working solo/sequentially
- **User Story 3 (Phase 5)**: Depends on Foundational + US2's `professional-service-service.ts`/route/hook/`professional-service-item.tsx` (T019, T021/T030 share a route file, T025 is extended by T034) — must follow US2
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Shared-file notes (sequence these even though not all are marked [P])

- `lib/validation/service.ts`: T007 (US1) → T018 (US2) → T028 (US3), additive exports each time
- `app/api/workspace/members/[membershipId]/services/[serviceId]/route.ts`: T021 (US2, adds `DELETE`) → T030 (US3, adds `PATCH`)
- `hooks/services/use-professional-services.ts`: T022 (US2, creates file) → T031 (US3, adds one hook)
- `components/professionals/professional-service-item.tsx`: T025 (US2, creates file) → T034 (US3, wires in the custom-price control)

### Within Each User Story

- Validation schema → service layer → route handlers → hooks → `frontend-design` skill gate → components → page/integration wiring
- Story complete and independently testable at its checkpoint before moving to the next priority

### Parallel Opportunities

- Foundational: T004, T005, T006 in parallel after T003
- US1: T007 can start immediately after Foundational; T011 (hooks) can be built in parallel with T009/T010 (routes) since the contract shape is already fixed by `contracts/services-api.md`
- US2: T022 (hooks) in parallel with T020/T021 (routes) for the same reason
- US3: T031 (hook) in parallel with T030 (route)
- Across stories: if staffed by multiple developers, US2 and US3 backend (service/route) work can start once Foundational is done, but must coordinate on the shared files listed above

---

## Parallel Example: User Story 1

```bash
# After T007 (schemas) and T008 (service layer) are done:
Task: "Implement GET/POST /api/workspace/services in app/api/workspace/services/route.ts"
Task: "Create hooks/services/use-services.ts (useServices, useCreateService, useUpdateService)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T007–T017)
4. **STOP and VALIDATE**: run Quickstart Scenario 1 independently
5. Deploy/demo if ready — a working service catalog with no associations yet

### Incremental Delivery

1. Setup + Foundational → foundation ready (schema migrated, helpers in place)
2. Add User Story 1 → validate Scenario 1 → deploy/demo (MVP)
3. Add User Story 2 → validate Scenario 2 (incl. SC-005 deactivation survival) → deploy/demo
4. Add User Story 3 → validate Scenario 3 (incl. SC-004 price propagation) → deploy/demo
5. Phase 6 polish (tsc/lint + full quickstart run) before considering the feature done

---

## Notes

- [P] tasks touch different files with no completed-task dependency
- [Story] label maps every phase-3+ task to US1/US2/US3 for traceability
- No test tasks: the spec/plan do not request an automated suite; `quickstart.md` is the validation surface (T036)
- Money is always a JSON `number` (reais) at every API boundary — never a raw Prisma `Decimal` (research.md §1)
- No delete endpoint exists for services anywhere (FR-009) — only `status` toggling
- Every mutation handler re-derives `workspaceId` from `resolveTenant()` — never trusts `serviceId`/`membershipId` path params without a `workspaceId`-scoped lookup (Constitution I/VIII)
