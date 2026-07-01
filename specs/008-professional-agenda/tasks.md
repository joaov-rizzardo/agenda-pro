---

description: "Task list for Agenda de Profissionais"

---

# Tasks: Agenda de Profissionais

**Input**: Design documents from `/specs/008-professional-agenda/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No automated test suite exists in this repo and the spec does not request one (Constitution: "Tests are written when explicitly requested"). Verification is manual per [quickstart.md](./quickstart.md); no test tasks are generated.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P1/P2/P2/P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1…US6)
- Every task includes an exact file path

## Path Conventions

Single Next.js project (App Router) at the repository root — `app/`, `components/`, `lib/`, `hooks/`, `prisma/` — matching the existing 006/007 feature layout (see plan.md § Project Structure).

---

## Phase 1: Setup

**Purpose**: Nothing new to scaffold — this feature reuses the existing Next.js/Prisma/React Query/shadcn stack with zero new dependencies (research.md §1/§2). Setup work is folded into Phase 2 (schema + shared helpers), since there is no separate project-initialization step for a brownfield feature.

*(No tasks — proceed to Phase 2.)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, migration, pure business-rule helpers, validation schemas and the business-hours read/write service that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `AppointmentStatus` and `AppointmentEventType` enums and the `Appointment`, `AppointmentEvent`, `WorkspaceBusinessHours` models to `prisma/schema.prisma`, plus `appointments`/`businessHours` relations on `Workspace`, `appointments` on `WorkspaceMembership`, and `appointments` on `Service`, exactly per data-model.md (fields, `@@index`, `@@unique(workspaceId)` on `WorkspaceBusinessHours`, `onDelete: Cascade` on `AppointmentEvent.appointment`)
- [x] T002 Run `npx prisma migrate dev --name professional_agenda` to generate the migration from T001, then hand-edit the generated `prisma/migrations/<ts>_professional_agenda/migration.sql` to append the raw SQL from research.md §3 (`CREATE EXTENSION IF NOT EXISTS btree_gist;` and the partial `EXCLUDE USING gist` constraint `appointment_no_overlap` on `Appointment` scoped to `status = 'SCHEDULED'`), then re-run `npx prisma migrate dev` so the constraint applies; run `npx prisma generate` to refresh the client
- [x] T003 [P] Create `lib/agenda/time-grid.ts`: pure helpers — build the list of 15-minute slot boundaries for a day given `openMinutes`/`closeMinutes`, compute an appointment block's `top`/`height` percentage from `startsAt`/`endsAt` relative to the business-hours window, and step a `Date` by ±1 day / to "today" (research.md §1/§5)
- [x] T004 [P] Create `lib/agenda/scheduling-rules.ts`: pure helpers — `isPastStart(startsAt, now)` (FR-013), `isWithinBusinessHours(startsAt, endsAt, businessHours)` (FR-002a/FR-028), `intervalsOverlap(aStart, aEnd, bStart, bEnd)` (FR-010), and `computeEndsAt(startsAt, durationMinutes)` (FR-009)
- [x] T005 [P] Create `lib/validation/business-hours.ts`: `UpsertBusinessHoursSchema` (Zod) validating `openMinutes`/`closeMinutes` as integers in `[0, 1440]` with `closeMinutes > openMinutes`, and `openWeekdays` as a set of unique integers in `[0, 6]`, per contracts/business-hours-api.md
- [x] T006 [P] Create `lib/validation/appointment.ts`: `ListAppointmentsSchema` (query: optional `professionalId`, required `date` as `YYYY-MM-DD`, optional `includeCancelled` boolean default `false`), `CreateAppointmentSchema` (`professionalId`, `serviceId`, non-empty `clientName`, non-empty `clientPhone`, `startsAt` ISO datetime), `RescheduleAppointmentSchema` (`startsAt` ISO datetime, optional `professionalId`), `SetAppointmentStatusSchema` (`status: "COMPLETED" | "NO_SHOW"`), `CancelAppointmentSchema` (optional `reason`), per contracts/appointments-api.md
- [x] T007 Create `lib/workspace/business-hours-service.ts`: `getBusinessHours(workspaceId)` returning a `BusinessHoursDTO` (`openMinutes`, `closeMinutes`, `openWeekdays`, `isDefault`) — the default `{480, 1080, [0,1,2,3,4,5,6], isDefault: true}` when no row exists (FR-027) — and `upsertBusinessHours(workspaceId, data)` that creates/updates the unique `WorkspaceBusinessHours` row for that workspace and returns the DTO with `isDefault: false`, per contracts/business-hours-api.md (depends on T001, T005)

**Checkpoint**: Schema migrated, pure rule helpers and validation schemas in place, business hours readable/writable — user story implementation can now begin.

---

## Phase 3: User Story 1 — Visualizar a agenda de um profissional por horário (Priority: P1) 🎯 MVP

**Goal**: A profissional autenticado abre `/dashboard/agenda` e vê seus próprios agendamentos do dia numa grade de horários, navega entre dias, e vê o detalhe de um agendamento ao clicar nele.

**Independent Test**: Logar como um profissional com agendamentos existentes e verificar que todos aparecem na grade nos horários corretos; navegar dias; abrir o detalhe de um agendamento.

### Implementation for User Story 1

- [x] T008 [US1] Create `lib/workspace/appointment-service.ts` with `AppointmentDTO`/`AppointmentEventDTO` types and `listAppointments(params: { workspaceId, callerMembershipId, callerRole, professionalId?, date, includeCancelled })`: resolves the target membership (defaults to `callerMembershipId` when `professionalId` is omitted), applies the target-vs-self rule from research.md §7 (throws `WorkspaceAuthError(403, ...)` when `professionalId` differs from the caller's own membership and `callerRole` is not `OWNER`/`ADMIN`), throws `WorkspaceAuthError(404, ...)` when the target membership does not resolve in `workspaceId`, queries `SCHEDULED`/`COMPLETED`/`NO_SHOW` appointments for that membership on the given day (plus `CANCELLED` when `includeCancelled`), and returns them alongside the effective `businessHours`/`isOpen` for that weekday (via `getBusinessHours` from T007), per contracts/appointments-api.md `GET` response shape (depends on T001, T004, T007)
- [x] T009 [US1] Add `getAppointmentDetail(params: { workspaceId, callerMembershipId, callerRole, appointmentId })` to `lib/workspace/appointment-service.ts`: scoped `where: { id, workspaceId }` (cross-tenant id → `WorkspaceAuthError(404, ...)`), applies the same target-vs-self rule against the appointment's `membershipId`, and returns `{ appointment: AppointmentDTO, events: AppointmentEventDTO[] }` ordered by `createdAt`, per contracts/appointments-api.md (depends on T008)
- [x] T010 [US1] Create `app/api/workspace/appointments/route.ts` `GET` handler: `resolveTenant()` → `requireWorkspaceRole(userId, workspaceId, ["OWNER","ADMIN","MEMBER"])` to get the caller's membership → Zod-validate query with `ListAppointmentsSchema` (T006) → call `listAppointments` (T008) → typed JSON `200`; `catch` → `errorResponse(error)`, per contracts/appointments-api.md (depends on T006, T008)
- [x] T011 [US1] Create `app/api/workspace/appointments/[appointmentId]/route.ts` `GET` handler: same tenant/role resolution → call `getAppointmentDetail` (T009) → `{ appointment, events }` `200`; `catch` → `errorResponse(error)` (depends on T009)
- [x] T012 [US1] Edit `app/dashboard/agenda/page.tsx` to a Server Component: `auth()` + redirect to `/login` when absent, resolve the caller's `WorkspaceMembership` (role + status), redirect to `/selecionar-workspace` when not `ACTIVE`, fetch today's appointments via `listAppointments` (own membership) and the effective business hours, and render `<AgendaView callerRole callerMembershipId initialAppointments initialBusinessHours initialDate />`, mirroring the guard in `app/dashboard/servicos/page.tsx` (depends on T008)
- [x] T013 [P] [US1] Invoke the `frontend-design` skill for the agenda screen (time grid, hour rail, appointment block, day navigator, appointment detail dialog) at the smallest viewport first (Constitution IV/IX), producing the visual spec these components implement
- [x] T014 [US1] Create `hooks/agenda/use-appointments.ts`: `useAppointments({ professionalId?, date, includeCancelled? }, initialData?)` (React Query, key `["appointments", professionalId ?? "self", date, includeCancelled]`) hitting `GET /api/workspace/appointments`, and `useAppointmentDetail(appointmentId)` hitting `GET /api/workspace/appointments/[id]`, using `apiRequest` per `hooks/services/use-services.ts` conventions (depends on T010, T011)
- [x] T015 [US1] Create `components/agenda/agenda-time-grid.tsx` (`"use client"`): renders the 15-minute vertical grid (hour rail + slot surface) for a day using `lib/agenda/time-grid.ts` (T003), positions `AgendaAppointmentBlock` children absolutely by `top`/`height`, mobile-first single column widened on `md:+` (depends on T003, T013)
- [x] T016 [P] [US1] Create `components/agenda/agenda-appointment-block.tsx` (`"use client"`): one positioned appointment block showing client name, service name, start–end time, and a status-driven token color (Agendado/Concluído/Cancelado/Não compareceu per research.md §5), `onClick` opens the detail dialog (depends on T013)
- [x] T017 [P] [US1] Create `components/agenda/agenda-toolbar.tsx` (`"use client"`): dia anterior / hoje / próximo navigation buttons plus the formatted date label (`Intl.DateTimeFormat` pt-BR), using `lib/agenda/time-grid.ts` day-stepping helper (depends on T003, T013)
- [x] T018 [US1] Create `components/agenda/appointment-detail-dialog.tsx` (`"use client"`, shadcn `Dialog`): shows cliente, serviço, horário início/fim, duração and status for a selected appointment via `useAppointmentDetail` (T014); read-only in this story (reschedule/cancel actions are added in US4/US5) (depends on T013, T014)
- [x] T019 [US1] Create `components/agenda/agenda-view.tsx` (`"use client"`): owns `selectedDay` (`useState`, initialized from `initialDate`) and the open/selected-appointment dialog state; wires `AgendaToolbar`, `AgendaTimeGrid` (fed by `useAppointments` with React Query `initialData`), and `AppointmentDetailDialog`; renders an empty-state message in pt-BR when there are no appointments for the day (FR-002 acceptance 2) (depends on T014, T015, T016, T017, T018)

**Checkpoint**: `/dashboard/agenda` renders a working day grid for the caller's own agenda with day navigation and appointment detail — independently testable per quickstart.md Scenario 1.

---

## Phase 4: User Story 2 — ADMIN/OWNER visualizar e alternar entre agendas de outros profissionais (Priority: P1)

**Goal**: Um ADMIN/OWNER vê um seletor de profissionais e alterna a agenda exibida; um MEMBER não vê o seletor e é bloqueado no servidor ao tentar acessar a agenda de outro profissional.

**Independent Test**: Logar como ADMIN, selecionar um profissional diferente na lista, e verificar que a grade exibe os agendamentos daquele profissional; logar como MEMBER e confirmar ausência do seletor e bloqueio de `GET .../appointments?professionalId=<outro>` com `403`.

> The server-side target-vs-self rule (FR-005/FR-007/FR-025) is already enforced by `listAppointments`/`getAppointmentDetail` from US1 (T008/T009) — this story only adds the client-facing professional switcher and the page wiring to pass a non-self `professionalId` for OWNER/ADMIN callers.

### Implementation for User Story 2

- [x] T020 [US2] Edit `app/dashboard/agenda/page.tsx` to also fetch the workspace's member list via `listMembers` (existing `lib/workspace/member-service.ts`) when the caller's role is `OWNER`/`ADMIN`, and pass it to `AgendaView` as `initialMembers` (undefined/omitted for `MEMBER`) (depends on T012)
- [x] T021 [US2] Create `components/agenda/agenda-professional-select.tsx` (`"use client"`, shadcn `Select`): lists `ACTIVE` professionals from `useMembers()` (existing `hooks/professionals/use-members.ts`), only rendered for `callerRole` `OWNER`/`ADMIN`; emits the selected `membershipId` to the parent
- [x] T022 [US2] Edit `components/agenda/agenda-view.tsx` to own `selectedProfessionalId` (`useState`, defaulting to the caller's own membership), render `AgendaProfessionalSelect` only for `OWNER`/`ADMIN` (per `initialMembers` presence from T020), and pass `selectedProfessionalId` through to `useAppointments`/`AgendaTimeGrid`/dialogs so switching professionals re-fetches and re-renders the grid (depends on T019, T020, T021)

**Checkpoint**: OWNER/ADMIN can switch between professionals' agendas in ≤ 2 interactions (SC-003); MEMBER sees no selector and is blocked server-side (SC-005) — independently testable per quickstart.md Scenario 2.

---

## Phase 5: User Story 3 — Criar um novo agendamento pela tela de agenda (Priority: P1)

**Goal**: Um profissional (para si) ou ADMIN/OWNER (para qualquer profissional) cria um agendamento a partir de um horário livre na grade, escolhendo serviço e informando cliente (nome + telefone).

**Independent Test**: Clicar num horário livre, preencher serviço e cliente, salvar, e verificar que o agendamento aparece na grade na posição correta; tentar sobrepor horário do mesmo profissional e ver o bloqueio.

### Implementation for User Story 3

- [x] T023 [US3] Add `createAppointment(params: { workspaceId, callerMembershipId, callerRole, actorId, data: CreateAppointmentInput })` to `lib/workspace/appointment-service.ts`: applies the target-vs-self rule (T008's rule) against `data.professionalId`, re-verifies the target membership is `ACTIVE` in `workspaceId` (FR-012, else `404`/`409`), re-verifies `data.serviceId` resolves to an `ACTIVE` service in `workspaceId` (FR-011, else `404`/`409`), derives `endsAt = computeEndsAt(startsAt, service.durationMinutes)` (T004, FR-009 — never trusts a client `endsAt`), rejects `startsAt < now` (T004, FR-013 → `409`), rejects out-of-hours/closed-day via `getBusinessHours` + `isWithinBusinessHours` (T004/T007, FR-002a/FR-028 → `409`), and inside `prisma.$transaction` re-checks for an overlapping `SCHEDULED` appointment (T004's `intervalsOverlap`, FR-010 → `409` "Este horário conflita com outro agendamento.") before creating the `Appointment` (`status: SCHEDULED`) and a `CREATED` `AppointmentEvent`; catches Postgres `23P01` (exclusion violation) and re-maps it to the same `409` (research.md §3), per contracts/appointments-api.md (depends on T001, T002, T004, T007, T008)
- [x] T024 [US3] Add the `POST` handler to `app/api/workspace/appointments/route.ts`: `resolveTenant()` → `requireWorkspaceRole(..., ["OWNER","ADMIN","MEMBER"])` → Zod-validate body with `CreateAppointmentSchema` (T006) → call `createAppointment` (T023) → `{ appointment }` `201`; `catch` → `errorResponse(error)`, per contracts/appointments-api.md (depends on T006, T023)
- [x] T025 [US3] Add `useCreateAppointment()` to `hooks/agenda/use-appointments.ts`: mutation hitting `POST /api/workspace/appointments`, invalidating the `["appointments", ...]` query key on success (depends on T014, T024)
- [x] T026 [US3] Create `components/agenda/appointment-form-dialog.tsx` (`"use client"`, shadcn `Dialog` + `Select` + `Input` + `Label`): create-mode form — pre-fills `startsAt` from the clicked slot, an active-services-only `Select` (fetched via existing `hooks/services/use-services.ts` filtered to `status: "ACTIVE"`) that auto-computes and displays the end time from the chosen service's `durationMinutes`, `clientName`/`clientPhone` text inputs, client-side required-field validation with pt-BR messages (FR-008 acceptance 6), submits via `useCreateAppointment` (T025), and surfaces server error messages (conflict/past/hours/inactive) via `sonner` toast (depends on T013, T025)
- [x] T027 [US3] Edit `components/agenda/agenda-time-grid.tsx` so clicking an empty slot opens `AppointmentFormDialog` in create mode pre-filled with that slot's start time (FR-008 acceptance 1), and edit `components/agenda/agenda-view.tsx` to own the create-dialog open state and render `AppointmentFormDialog` (depends on T015, T019, T026)

**Checkpoint**: New appointments can be created from a free slot with service-driven duration, conflict/past/hours/inactive-service/inactive-professional blocks all enforced server-side — independently testable per quickstart.md Scenario 3.

---

## Phase 6: User Story 4 — Remarcar um agendamento existente (Priority: P2)

**Goal**: Mover um agendamento `SCHEDULED` para um novo horário (e, para ADMIN/OWNER, um novo profissional), reaplicando as regras de conflito/passado/expediente e registrando o histórico.

**Independent Test**: Selecionar um agendamento existente, alterar o horário para um horário livre, salvar, e verificar que ele aparece na nova posição e não mais na antiga; tentar remarcar para um horário conflitante e ver o bloqueio; verificar o histórico.

### Implementation for User Story 4

- [x] T028 [US4] Add `rescheduleAppointment(params: { workspaceId, callerMembershipId, callerRole, actorId, appointmentId, data: RescheduleAppointmentInput })` to `lib/workspace/appointment-service.ts`: loads the appointment scoped `where: { id, workspaceId }` (else `404`), applies the target-vs-self rule against its current `membershipId`, rejects when `status !== "SCHEDULED"` (FR-017 → `409`), when `data.professionalId` is present and differs from the current `membershipId` requires `callerRole` to be `OWNER`/`ADMIN` (FR-015, else `403`) and re-verifies that membership is `ACTIVE` in `workspaceId` (else `404`/`409`), re-derives `endsAt` from the (possibly unchanged) service's `durationMinutes`, re-applies past-time / business-hours / overlap checks exactly as `createAppointment` (T023, excluding the appointment's own current row from the overlap check) inside `prisma.$transaction`, updates `startsAt`/`endsAt`/`membershipId`, and writes a `RESCHEDULED` `AppointmentEvent` with `previousStartsAt`/`newStartsAt` and `previousMembershipId`/`newMembershipId` when the professional changed (FR-018), per contracts/appointments-api.md (depends on T023)
- [x] T029 [US4] Add `setAppointmentStatus(params: { workspaceId, callerMembershipId, callerRole, actorId, appointmentId, status })` to `lib/workspace/appointment-service.ts`: loads + target-vs-self rule as T028, allows only `SCHEDULED → COMPLETED` or `SCHEDULED → NO_SHOW` (else `409`), updates `status`, and writes a `STATUS_CHANGED` `AppointmentEvent` with `previousStatus`/`newStatus`, per contracts/appointments-api.md
- [x] T030 [US4] Create `app/api/workspace/appointments/[appointmentId]/route.ts` `PATCH` handler: `resolveTenant()` → `requireWorkspaceRole(..., ["OWNER","ADMIN","MEMBER"])` → Zod-validate body against `RescheduleAppointmentSchema` when `startsAt` is present or `SetAppointmentStatusSchema` when `status` is present (T006) → call `rescheduleAppointment` (T028) or `setAppointmentStatus` (T029) accordingly → `{ appointment }` `200`; `catch` → `errorResponse(error)`, per contracts/appointments-api.md (depends on T006, T028, T029)
- [x] T031 [US4] Add `useRescheduleAppointment()` and `useSetAppointmentStatus()` to `hooks/agenda/use-appointments.ts`: mutations hitting `PATCH /api/workspace/appointments/[id]`, invalidating the appointments list and detail query keys on success (depends on T014, T030)
- [x] T032 [US4] Extend `components/agenda/appointment-form-dialog.tsx` with a reschedule mode (pre-filled from the selected appointment's current `startsAt`/`membershipId`/`serviceId`; the professional field is only editable for `OWNER`/`ADMIN` per FR-015) submitting via `useRescheduleAppointment` (T031), and surfacing the same server error classes as create (conflict/past/hours) (depends on T026, T031)
- [x] T033 [US4] Extend `components/agenda/appointment-detail-dialog.tsx` to render the event history (previous/new horário and, when present, previous/new professional — SC-006) from `useAppointmentDetail` (T014), add a "Remarcar" action (enabled only when `status === "SCHEDULED"`) that opens `AppointmentFormDialog` in reschedule mode (T032), and add "Marcar como concluído"/"Marcar como não compareceu" actions calling `useSetAppointmentStatus` (T031) (depends on T018, T031, T032)

**Checkpoint**: Existing `SCHEDULED` appointments can be moved to a new time/professional with full conflict/past/hours re-validation and a complete history trail — independently testable per quickstart.md Scenario 4.

---

## Phase 7: User Story 5 — Cancelar um agendamento (Priority: P2)

**Goal**: Cancelar um agendamento `SCHEDULED` com confirmação explícita e motivo opcional, liberando o horário e registrando o cancelamento no histórico.

**Independent Test**: Selecionar um agendamento existente, cancelá-lo, e verificar que o status muda para "cancelado", o horário fica livre para novos agendamentos, e o histórico registra o motivo/horário.

### Implementation for User Story 5

- [x] T034 [US5] Add `cancelAppointment(params: { workspaceId, callerMembershipId, callerRole, actorId, appointmentId, reason? })` to `lib/workspace/appointment-service.ts`: loads the appointment scoped `where: { id, workspaceId }` (else `404`), applies the target-vs-self rule, rejects when `status !== "SCHEDULED"` (FR-021 → `409`), and inside `prisma.$transaction` sets `status: "CANCELLED"`, `cancellationReason: reason ?? null` and writes a `CANCELLED` `AppointmentEvent` with the `reason` and timestamp (FR-022, SC-006), per contracts/appointments-api.md (depends on T008)
- [x] T035 [US5] Add the `DELETE` handler to `app/api/workspace/appointments/[appointmentId]/route.ts`: `resolveTenant()` → `requireWorkspaceRole(..., ["OWNER","ADMIN","MEMBER"])` → Zod-validate optional body with `CancelAppointmentSchema` (T006) → call `cancelAppointment` (T034) → `{ appointment }` `200`; `catch` → `errorResponse(error)`, per contracts/appointments-api.md (depends on T006, T034)
- [x] T036 [US5] Add `useCancelAppointment()` to `hooks/agenda/use-appointments.ts`: mutation hitting `DELETE /api/workspace/appointments/[id]` with an optional `{ reason }` body, invalidating the appointments list and detail query keys on success (depends on T014, T035)
- [x] T037 [US5] Create `components/agenda/appointment-cancel-dialog.tsx` (`"use client"`, shadcn `AlertDialog`): explicit confirmation (FR-020) with an optional `Textarea` for the cancellation reason, submitting via `useCancelAppointment` (T036) (depends on T013, T036)
- [x] T038 [US5] Edit `components/agenda/agenda-time-grid.tsx` to render `CANCELLED` appointments visually distinct (struck/faded per research.md §5, FR-023) and add a "mostrar cancelados" toggle in `components/agenda/agenda-view.tsx` that flips `includeCancelled` on `useAppointments` (T014); add a "Cancelar" action to `components/agenda/appointment-detail-dialog.tsx` (enabled only when `status === "SCHEDULED"`) that opens `AppointmentCancelDialog` (T037) (depends on T015, T016, T018, T019, T037)

**Checkpoint**: `SCHEDULED` appointments can be cancelled with confirmation + optional reason, freeing the slot and leaving a complete history entry — independently testable per quickstart.md Scenario 5.

---

## Phase 8: User Story 6 — Configurar o horário de funcionamento do workspace (Priority: P3)

**Goal**: OWNER/ADMIN configuram o horário de funcionamento único do workspace (dias + abertura/fechamento), que passa a delimitar a grade e as validações de criação/remarcação para todos os profissionais.

**Independent Test**: Alterar o horário de funcionamento do workspace e verificar que a grade de horários e as validações de criação/remarcação passam a respeitar o novo intervalo; marcar um dia como fechado e confirmar o bloqueio.

> The read side (`getBusinessHours` with default fallback, T007) and the enforcement side (`isWithinBusinessHours` applied in create/reschedule, T004/T023/T028) already ship in Phase 2/5/6. This story adds the write endpoint and the OWNER/ADMIN settings UI.

### Implementation for User Story 6

- [x] T039 [US6] Create `app/api/workspace/business-hours/route.ts` `GET` handler (`resolveTenant()` → `requireWorkspaceRole(..., ["OWNER","ADMIN","MEMBER"])` → `getBusinessHours` (T007) → `{ businessHours }` `200`) and `PUT` handler (`resolveTenant()` → `requireWorkspaceRole(..., ["OWNER","ADMIN"])` → Zod-validate body with `UpsertBusinessHoursSchema` (T005) → `upsertBusinessHours` (T007) → `{ businessHours }` `200`); `catch` → `errorResponse(error)` on both, per contracts/business-hours-api.md (depends on T005, T007)
- [x] T040 [US6] Create `hooks/agenda/use-business-hours.ts`: `useBusinessHours(initialData?)` (React Query) hitting `GET /api/workspace/business-hours`, and `useUpdateBusinessHours()` mutation hitting `PUT /api/workspace/business-hours`, invalidating the business-hours query key on success (depends on T039)
- [x] T041 [P] [US6] Invoke the `frontend-design` skill for the business-hours settings form (open/close time inputs + open-weekday toggles) at the smallest viewport first (Constitution IV/IX)
- [x] T042 [US6] Create `components/settings/business-hours-section.tsx` (`"use client"`, shadcn `Input`/`Switch`/`Button`, OWNER/ADMIN only): open/close time fields and a 7-day open-weekday toggle group, seeded from `useBusinessHours` and saved via `useUpdateBusinessHours` (T040), with pt-BR validation messages matching `UpsertBusinessHoursSchema` (T005) (depends on T040, T041)
- [x] T043 [US6] Edit `app/dashboard/configuracoes/page.tsx` to fetch the caller's role/business hours server-side and mount `<BusinessHoursSection initialBusinessHours callerRole />` (rendered read-only or hidden for non-OWNER/ADMIN), mirroring the guard in `app/dashboard/servicos/page.tsx` (depends on T007, T042)

**Checkpoint**: OWNER/ADMIN can change the workspace's business hours; the agenda grid and create/reschedule validations immediately respect the new window and closed weekdays — independently testable per quickstart.md Scenario 6.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final quality gate across all stories.

- [x] T044 [P] Run `npx tsc --noEmit` and `npm run lint`, fixing any type or lint errors introduced across `lib/agenda/*`, `lib/workspace/appointment-service.ts`, `lib/workspace/business-hours-service.ts`, `lib/validation/*`, `app/api/workspace/appointments/**`, `app/api/workspace/business-hours/**`, `components/agenda/**`, `components/settings/business-hours-section.tsx`, and `hooks/agenda/**` (Constitution quality gate)
- [ ] T045 Walk through every scenario in [quickstart.md](./quickstart.md) end to end (Scenarios 1–6 plus the Tenant-isolation & permission checks section) at a mobile viewport first, then desktop, confirming SC-001…SC-007

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — empty.
- **Foundational (Phase 2)**: No dependencies beyond the existing codebase — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 only.
- **User Story 2 (Phase 4)**: Depends on Phase 2 **and** US1 (T008/T012/T019 — reuses the list endpoint's target-vs-self logic and the `AgendaView` shell).
- **User Story 3 (Phase 5)**: Depends on Phase 2 **and** US1 (T008 for the target-vs-self rule, T013/T015/T019 for the grid/dialog shell it wires into).
- **User Story 4 (Phase 6)**: Depends on Phase 2, US1 **and** US3 (T023, T026 — reschedule reuses the create validation path and the form dialog in reschedule mode).
- **User Story 5 (Phase 7)**: Depends on Phase 2 **and** US1 (T008, T013/T018/T019); independent of US3/US4's write paths.
- **User Story 6 (Phase 8)**: Depends on Phase 2 only for its own endpoint/UI (T005/T007); its enforcement effect is only observable once US3 (create) and US4 (reschedule) exist, but no US6 *task* edits US3/US4 files.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### User Story Dependencies (summary)

- US1 (P1): Foundational only.
- US2 (P1): Foundational + US1 (same list endpoint, same `AgendaView` shell).
- US3 (P1): Foundational + US1 (same shell); independent of US2.
- US4 (P2): Foundational + US1 + US3 (shares create's validation path and form dialog).
- US5 (P2): Foundational + US1; independent of US3/US4.
- US6 (P3): Foundational only for its endpoint/UI; its blocking *effect* depends on US3/US4 already enforcing `isWithinBusinessHours`.

### Within Each User Story

- Services (`lib/workspace/*`) before Route Handlers (`app/api/**`) before hooks (`hooks/agenda/*`) before components (`components/agenda/**`, `components/settings/**`) before page wiring (`app/dashboard/**/page.tsx`).
- `frontend-design` skill invocation (T013, T041) before the components it governs are built (Constitution IV/IX gate).

### Parallel Opportunities

- T003, T004, T005, T006 (Phase 2) touch disjoint files and can run in parallel once T001/T002 land.
- T016 and T017 (US1) touch disjoint files and can run in parallel once T013 is done.
- T013 (US1) and T041 (US6) are independent `frontend-design` invocations for different screens and can run in parallel with each other's phase.
- Different user stories cannot fully run in parallel due to the dependency chain above (US2/US3/US4/US5 all build on US1's `AgendaView`), but once US1 is complete, US2, US3 and US5 can proceed in parallel by different developers; US4 must wait on US3.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T001 (schema) + T002 (migration) land, run these in parallel — disjoint files:
Task: "Create lib/agenda/time-grid.ts pure grid/day-nav helpers"
Task: "Create lib/agenda/scheduling-rules.ts pure overlap/past/hours/duration helpers"
Task: "Create lib/validation/business-hours.ts UpsertBusinessHoursSchema"
Task: "Create lib/validation/appointment.ts List/Create/Reschedule/SetStatus/Cancel schemas"
```

## Parallel Example: User Story 1

```bash
# After T013 (frontend-design) is done, run these in parallel — disjoint files:
Task: "Create components/agenda/agenda-appointment-block.tsx"
Task: "Create components/agenda/agenda-toolbar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational.
2. Complete Phase 3: User Story 1 (`/dashboard/agenda` read-only day grid + detail for the caller's own agenda).
3. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently.
4. Deploy/demo if ready.

### Incremental Delivery

1. Foundational → US1 (view own agenda, MVP) → validate.
2. Add US2 (ADMIN/OWNER switcher) → validate (quickstart Scenario 2).
3. Add US3 (create) → validate (quickstart Scenario 3) — the agenda becomes actionable, not just a viewer.
4. Add US4 (reschedule) → validate (quickstart Scenario 4).
5. Add US5 (cancel) → validate (quickstart Scenario 5).
6. Add US6 (business hours) → validate (quickstart Scenario 6).
7. Phase 9 polish (`tsc`/`lint` + full quickstart walkthrough).

### Parallel Team Strategy

With multiple developers, after Foundational + US1 land:

- Developer A: US2 (professional switcher).
- Developer B: US3 → then US4 (shares the create/reschedule validation path and form dialog, so one owner avoids merge conflicts on `appointment-service.ts`/`appointment-form-dialog.tsx`).
- Developer C: US5 (cancel — touches different files than US3/US4 aside from the shared detail dialog, T018/T033/T038 should be sequenced by whoever lands last).
- US6 can be picked up by any developer once Foundational is done — it only touches its own files until Phase 9 validation.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- No test tasks: the spec does not request an automated suite; verification is manual per quickstart.md.
- `workspaceId` is always re-derived from `resolveTenant()` (session), never trusted from request body/params (Constitution I/VIII) — every service task above states its tenant/target-vs-self re-check explicitly.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before moving to the next.
