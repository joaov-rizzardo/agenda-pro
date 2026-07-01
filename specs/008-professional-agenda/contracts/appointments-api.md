# Contract: Appointments API

Base: `/api/workspace/appointments`. All handlers follow the feature-006/007 pattern: `try` →
`resolveTenant()` (workspace from session, never from input — Constitution I) → `requireWorkspaceRole`
→ **target-vs-self role check** (research §7) → Zod-validate → delegate to
`lib/workspace/appointment-service.ts` → typed JSON; `catch` → `errorResponse(error)`. Dates are ISO
strings on the wire (workspace wall-clock instants — research §4).

Common error shape: `{ "error": string }` (pt-BR) with status `400` (validation), `401` (no
session), `403` (not ACTIVE member / MEMBER acting on another professional / insufficient role),
`404` (appointment/service/professional not in workspace), `409` (time conflict / illegal state
transition), `500`.

**Target-vs-self rule (all routes)**: the caller's own membership is always allowed. Acting on a
`professionalId`/appointment whose `membershipId` ≠ the caller's own membership requires the caller
to be OWNER/ADMIN, re-checked server-side per request (FR-005/FR-007/FR-025). A MEMBER supplying
another professional's id → `403`.

---

## `GET /api/workspace/appointments`

List one professional's appointments for one day. **Auth**: any ACTIVE member, subject to the
target-vs-self rule.

**Query** (`ListAppointmentsSchema`):
- `professionalId` (optional) — the membership whose agenda to read. Omitted → caller's own
  membership. A MEMBER passing another id → `403`.
- `date` (required) — `YYYY-MM-DD`, the day to render.
- `includeCancelled` (optional, default `false`) — when `false`, `CANCELLED` appointments are
  omitted from the default grid (FR-023); when `true`, they are returned flagged for the
  "mostrar cancelados" filter.

**200**
```json
{
  "professionalId": "clx...",
  "date": "2026-07-01",
  "businessHours": { "openMinutes": 480, "closeMinutes": 1080, "openWeekdays": [1,2,3,4,5] },
  "isOpen": true,
  "appointments": [
    {
      "appointmentId": "clx...",
      "membershipId": "clx...",
      "serviceId": "clx...",
      "serviceName": "Corte masculino",
      "clientName": "Maria Souza",
      "clientPhone": "(11) 90000-0000",
      "startsAt": "2026-07-01T09:00:00.000Z",
      "endsAt": "2026-07-01T09:30:00.000Z",
      "durationMinutes": 30,
      "status": "SCHEDULED",
      "cancellationReason": null
    }
  ]
}
```
`businessHours`/`isOpen` echo the effective config for that weekday (default applied when unset —
FR-027) so the client can size the grid and disable closed days without a second request.

---

## `POST /api/workspace/appointments`

Create an appointment. **Auth**: any ACTIVE member for their own agenda; OWNER/ADMIN for any
professional. Created with `status = SCHEDULED` (FR-014). Writes a `CREATED` history event in the
same transaction.

**Body** (`CreateAppointmentSchema`)
```json
{
  "professionalId": "clx...",
  "serviceId": "clx...",
  "clientName": "Maria Souza",
  "clientPhone": "(11) 90000-0000",
  "startsAt": "2026-07-01T09:00:00.000Z"
}
```
Server-side rules (all → typed error; never trust the client):
- `professionalId` must be an **ACTIVE** membership in the session workspace (FR-012) → else `404`/`409`.
- `serviceId` must be an **ACTIVE** service in the session workspace (FR-011) → else `404`/`409`.
- `endsAt` is **derived** = `startsAt + service.durationMinutes` (FR-009); never accepted from client.
- `startsAt` ≥ now (FR-013) → else `409` "Não é possível agendar no passado."
- `[startsAt, endsAt)` within business hours on an open weekday (FR-002a/FR-028) → else `409`
  "O workspace está fechado nesse horário."
- no overlap with another `SCHEDULED` appointment of that professional (FR-010; transaction check +
  `EXCLUDE`, research §3) → else `409` "Este horário conflita com outro agendamento."
- `clientName`, `clientPhone` required non-empty (FR-008) → else `400`.

**201** → `{ "appointment": AppointmentDTO }`

---

## `GET /api/workspace/appointments/[appointmentId]`

Appointment detail incl. history. **Auth**: target-vs-self rule against the appointment's
`membershipId`. Scoped `where: { id, workspaceId }`; another tenant's id → `404`.

**200** → `{ "appointment": AppointmentDTO, "events": AppointmentEventDTO[] }`
where `AppointmentEventDTO` = `{ type, previousStartsAt?, newStartsAt?, previousMembershipId?,
newMembershipId?, previousStatus?, newStatus?, reason?, actorId, createdAt }` (SC-006).

---

## `PATCH /api/workspace/appointments/[appointmentId]`

Reschedule (FR-015) **or** change status (mark COMPLETED / NO_SHOW). **Auth**: target-vs-self rule;
changing the responsible professional requires OWNER/ADMIN (FR-015). Only a `SCHEDULED` appointment
may be rescheduled (FR-017). Writes a `RESCHEDULED` or `STATUS_CHANGED` event in the same transaction.

**Body** (`UpdateAppointmentSchema` — exactly one intent):
```json
// Reschedule
{ "startsAt": "2026-07-01T14:00:00.000Z", "professionalId": "clx..." }
// or change status
{ "status": "COMPLETED" }
```
Reschedule rules re-apply FR-010 (overlap) and FR-013 (past) and FR-028 (hours) exactly as create
(FR-016); `endsAt` re-derived from the current service duration; changing `professionalId` requires
OWNER/ADMIN and moves it to that professional's agenda (US4.3), recording previous/new professional
in the event (FR-018). Rescheduling a `COMPLETED`/`CANCELLED` appointment → `409` (FR-017).
Status change is limited to `SCHEDULED → COMPLETED|NO_SHOW`.

**200** → `{ "appointment": AppointmentDTO }`

---

## `DELETE /api/workspace/appointments/[appointmentId]`  (= cancel)

Cancel a `SCHEDULED` appointment (FR-019). **Auth**: target-vs-self rule. Does **not** hard-delete —
sets `status = CANCELLED`, freeing the slot, and records reason + timestamp in a `CANCELLED` history
event (FR-022, SC-006), all in one transaction. Cancelling a `COMPLETED`/`CANCELLED`/`NO_SHOW`
appointment → `409` (FR-021).

**Body** (`CancelAppointmentSchema`, optional): `{ "reason": "Cliente remarcou por telefone" }`
(reason optional — FR-022; confirmation is a client-side AlertDialog — FR-020).

**200** → `{ "appointment": AppointmentDTO }`  (status now `CANCELLED`).
