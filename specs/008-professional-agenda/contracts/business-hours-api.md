# Contract: Business Hours API

Base: `/api/workspace/business-hours`. One workspace-scoped resource (spec Key Entities). Handlers
follow the standard pattern: `try` → `resolveTenant()` → `requireWorkspaceRole` → Zod-validate →
delegate to `lib/workspace/business-hours-service.ts` → typed JSON; `catch` → `errorResponse(error)`.
Times are minutes-from-midnight; weekdays are integers `0 = domingo … 6 = sábado` (research §4).

Common error shape: `{ "error": string }` (pt-BR): `400` (validation), `401`, `403` (not ACTIVE /
not OWNER-ADMIN for write), `500`.

---

## `GET /api/workspace/business-hours`

Read the workspace business hours. **Auth**: any ACTIVE member (the grid needs it). When no row
exists, returns the **default** (08:00–18:00 every day, FR-027) without persisting it.

**200**
```json
{
  "businessHours": {
    "openMinutes": 480,
    "closeMinutes": 1080,
    "openWeekdays": [0, 1, 2, 3, 4, 5, 6],
    "isDefault": true
  }
}
```
`isDefault` is `true` when no explicit config has been saved yet.

---

## `PUT /api/workspace/business-hours`

Create or update (upsert) the workspace business hours. **Auth**: OWNER/ADMIN only (FR-026).
Upsert scoped by `workspaceId` (unique) — always the session workspace, never client-supplied.

**Body** (`UpsertBusinessHoursSchema`)
```json
{ "openMinutes": 540, "closeMinutes": 1200, "openWeekdays": [1, 2, 3, 4, 5] }
```
Rules: `openMinutes`/`closeMinutes` integers in `[0, 1440]` with `closeMinutes > openMinutes`;
`openWeekdays` a set of unique integers each in `[0, 6]` (empty = fechado todos os dias). Invalid →
`400` with pt-BR message.

**200** → `{ "businessHours": BusinessHoursDTO }` (`isDefault: false`).

**Effect**: subsequent grid renders and every create/reschedule validation (FR-028) use the new
window immediately; a day removed from `openWeekdays` rejects new/rescheduled bookings on that day
(US6.3). Existing appointments already outside the new window are not modified (only new writes are
constrained).
