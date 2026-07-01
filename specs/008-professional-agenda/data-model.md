# Phase 1 Data Model: Agenda de Profissionais

Derives from the spec's Key Entities and Functional Requirements. Three new tenant-scoped models and
one enum, added as a single additive migration (`prisma migrate dev`). The migration file also
enables `btree_gist` and adds the partial `EXCLUDE` overlap constraint as raw SQL (research §3).

Conventions match the existing schema: `cuid()` ids, `workspaceId` FK + index on every tenant-scoped
table (Constitution I/VI), `Decimal @db.Decimal(10,2)` for money exposed as `number` in DTOs (there
is no money on Appointment in this feature — see below), `DateTime` timestamps.

## Enum: `AppointmentStatus`

```prisma
enum AppointmentStatus {
  SCHEDULED    // Agendado (default on create — FR-014)
  COMPLETED    // Concluído (manual — spec Assumptions)
  CANCELLED    // Cancelado (FR-019)
  NO_SHOW      // Não compareceu (manual — spec Assumptions)
}
```

Only `SCHEDULED` appointments participate in overlap detection and may be rescheduled/cancelled
(FR-010/FR-017/FR-021). `CANCELLED`/`COMPLETED`/`NO_SHOW` free the slot (FR-019).

## Model: `Appointment`

Represents one professional↔client compromise for a service in a time interval (spec Key Entities).

| Field                | Type                | Notes |
|----------------------|---------------------|-------|
| `id`                 | `String @id cuid()` | |
| `workspaceId`        | `String`            | Tenant FK (Constitution I). Indexed. |
| `membershipId`       | `String`            | The professional (`WorkspaceMembership`). Indexed. |
| `serviceId`          | `String`            | The booked service. Indexed. |
| `clientName`         | `String`            | Free text, required (FR-008). No persistent customer record (spec Assumptions). |
| `clientPhone`        | `String`            | Free text, required (FR-008). |
| `startsAt`           | `DateTime`          | Workspace wall-clock instant (research §4). |
| `endsAt`             | `DateTime`          | `startsAt + service.durationMinutes` at creation/reschedule (FR-009). |
| `status`            | `AppointmentStatus @default(SCHEDULED)` | FR-014. |
| `cancellationReason` | `String?`           | Optional, set on cancel (FR-022). |
| `createdById`        | `String`            | User (membership's user id or caller) who created it — for history/attribution. |
| `createdAt`          | `DateTime @default(now())` | |
| `updatedAt`          | `DateTime @updatedAt` | |

**Relations**: `workspace Workspace @relation(...)`, `membership WorkspaceMembership @relation(...)`,
`service Service @relation(...)`, `events AppointmentEvent[]`.

**Indexes**: `@@index([workspaceId])`, `@@index([membershipId])`, `@@index([serviceId])`, and a
composite `@@index([membershipId, startsAt])` to make the day/professional grid query and the overlap
pre-check fast.

**DB-level constraint** (raw SQL in the migration, research §3): partial `EXCLUDE` on
`(membershipId WITH =, tsrange(startsAt, endsAt, '[)') WITH &&) WHERE (status = 'SCHEDULED')`.

**Validation rules** (server-side, `lib/validation/appointment.ts` + `lib/agenda/scheduling-rules.ts`):
- `serviceId` must resolve to an **ACTIVE** service in the session workspace (FR-011).
- `membershipId` must resolve to an **ACTIVE** membership in the session workspace (FR-012).
- `startsAt` must be **≥ now** (FR-013/FR-016).
- `[startsAt, endsAt)` must fall within the workspace business hours on an **open** weekday
  (FR-002a/FR-028).
- `[startsAt, endsAt)` must not overlap another `SCHEDULED` appointment of the same membership
  (FR-010/FR-016; enforced by transaction check + `EXCLUDE`).
- `endsAt` is derived, never client-trusted: `endsAt = startsAt + service.durationMinutes` (FR-009).

**State transitions** (server-guarded):
`SCHEDULED → CANCELLED` (cancel, FR-019/FR-021), `SCHEDULED → COMPLETED` / `SCHEDULED → NO_SHOW`
(manual mark), reschedule keeps `SCHEDULED` but changes `startsAt`/`endsAt`/`membershipId`
(FR-015/FR-017). No transition out of `CANCELLED`/`COMPLETED`/`NO_SHOW` (FR-017/FR-021).

## Model: `AppointmentEvent` (history / audit trail)

Append-only lifecycle log satisfying FR-018, FR-022, SC-006 (research §6). Written in the same
transaction as the mutation it records.

| Field                  | Type                 | Notes |
|------------------------|----------------------|-------|
| `id`                   | `String @id cuid()`  | |
| `appointmentId`        | `String`             | FK → Appointment. Indexed. |
| `type`                 | `AppointmentEventType` | CREATED / RESCHEDULED / CANCELLED / STATUS_CHANGED. |
| `previousStartsAt`     | `DateTime?`          | Set on RESCHEDULED (FR-018). |
| `newStartsAt`          | `DateTime?`          | Set on RESCHEDULED (FR-018). |
| `previousMembershipId` | `String?`            | Set when reschedule changes professional (FR-015/US4.3). |
| `newMembershipId`      | `String?`            | " |
| `previousStatus`       | `AppointmentStatus?` | Set on CANCELLED / STATUS_CHANGED. |
| `newStatus`            | `AppointmentStatus?` | " |
| `reason`               | `String?`            | Cancellation reason (FR-022). |
| `actorId`              | `String`             | User who performed the action. |
| `createdAt`            | `DateTime @default(now())` | |

**Relation**: `appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)`.
**Index**: `@@index([appointmentId])`.

> `AppointmentEventType` is a second enum:
> `enum AppointmentEventType { CREATED RESCHEDULED CANCELLED STATUS_CHANGED }`.

The event carries no `workspaceId` of its own; it reaches the tenant through its `appointment`
(reads always join/scope through an Appointment already filtered by `workspaceId`).

## Model: `WorkspaceBusinessHours`

One row per workspace (spec Key Entities: "Pertence a exatamente um workspace"). Absence of a row
means the default 08:00–18:00 every day applies (FR-027) — the service returns a default DTO without
writing one.

| Field          | Type              | Notes |
|----------------|-------------------|-------|
| `id`           | `String @id cuid()` | |
| `workspaceId`  | `String @unique`  | One config per workspace. |
| `openMinutes`  | `Int`             | Minutes from midnight, open time (default 480 = 08:00). |
| `closeMinutes` | `Int`             | Minutes from midnight, close time (default 1080 = 18:00). |
| `openWeekdays` | `Int[]`           | Open days, `0 = domingo … 6 = sábado` (default `[0,1,2,3,4,5,6]`). |
| `createdAt`    | `DateTime @default(now())` | |
| `updatedAt`    | `DateTime @updatedAt` | |

**Relation**: `workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)`.

**Validation rules** (`lib/validation/business-hours.ts`):
- `openMinutes`, `closeMinutes` integers in `[0, 1440]`, `closeMinutes > openMinutes`.
- `openWeekdays` a set of unique integers each in `[0, 6]` (may be empty = closed every day).
- Only OWNER/ADMIN may upsert (FR-026).

## Relations added to existing models

- `Workspace` gains `appointments Appointment[]` and `businessHours WorkspaceBusinessHours?`.
- `WorkspaceMembership` gains `appointments Appointment[]` (the professional's agenda — spec Key
  Entities: "passa a ter uma agenda de agendamentos associada").
- `Service` gains `appointments Appointment[]`.

All additive; no drops (Constitution VI). The `EXCLUDE` constraint + `btree_gist` extension are the
only non-Prisma-expressible parts and are appended as raw SQL in the same migration file.
