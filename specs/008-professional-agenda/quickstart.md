# Quickstart & Validation: Agenda de Profissionais

Manual validation guide (no automated suite in this repo — Constitution: tests only when the spec
requests them). Run against a local dev server with a seeded workspace. Details live in
[data-model.md](./data-model.md), [contracts/](./contracts/), and [research.md](./research.md); this
file is the runnable walk-through.

## Prerequisites

- Node + the repo installed; `.env` with `DATABASE_URL` (Supabase/Postgres) and NextAuth vars set.
- Logged in to a workspace; know your role (see `/dashboard/profissionais`). You need one OWNER/ADMIN
  account **and** one MEMBER account in the same workspace to cover US2/US5 permission checks.
- At least two ACTIVE professionals and at least one ACTIVE service (feature 007) with a known
  duration (e.g. 30 min), plus one INACTIVE service to test FR-011.

## Setup

```bash
# 1. Extend the schema — additive (Appointment, AppointmentEvent, WorkspaceBusinessHours + enums).
npx prisma migrate dev --name professional_agenda

# 2. IMPORTANT: the migration also needs the overlap guarantee (research §3). After the models are
#    created, ensure the migration SQL includes (add by hand if migrate dev didn't emit it):
#      CREATE EXTENSION IF NOT EXISTS btree_gist;
#      ALTER TABLE "Appointment" ADD CONSTRAINT appointment_no_overlap
#        EXCLUDE USING gist ("membershipId" WITH =, tsrange("startsAt","endsAt",'[)') WITH &&)
#        WHERE ("status" = 'SCHEDULED');
#    Re-run `npx prisma migrate dev` (or `migrate deploy`) so the constraint is applied.

# 3. Regenerate the client (also runs on postinstall)
npx prisma generate

# 4. Start the app
npm run dev
```

Open `http://localhost:3000/dashboard/agenda`.

## Scenario 1 — View a professional's day (P1 / US1, FR-001…FR-004, SC-002)

1. As any professional, open the agenda. Expect a vertical time grid for **today** bounded by the
   business hours, your appointments positioned by start time + duration, each showing client,
   serviço and início/fim (FR-001/FR-003, acceptance 1).
2. A day with no appointments shows an empty grid, no error (acceptance 2).
3. Navigate **dia anterior / próximo / hoje** → grid updates for the selected day in ≤ 2 s
   (FR-002, acceptance 3, SC-002).
4. Click an appointment → detail view shows cliente, serviço, duração, status (FR-004, acceptance 4).

## Scenario 2 — ADMIN/OWNER professional switcher (P1 / US2, FR-005…FR-007, SC-003/005)

1. As OWNER/ADMIN, confirm a **professional selector** lists all ACTIVE professionals (acceptance 1).
2. Select a different professional → grid shows their appointments (acceptance 2, ≤ 2 interactions,
   SC-003).
3. Log in as the **MEMBER**: no selector; only your own agenda is shown (FR-005, acceptance 3).
4. **Server block (SC-005)**: as the MEMBER, in DevTools call
   `GET /api/workspace/appointments?professionalId=<another-member-id>&date=<today>` → expect `403`,
   not another professional's data (FR-007/FR-025, acceptance 4).

## Scenario 3 — Create an appointment (P1 / US3, FR-008…FR-014, SC-001/004)

1. Click a **free slot** → dialog opens with início pré-preenchido (acceptance 1). Should complete in
   < 1 min (SC-001).
2. Pick a serviço → duração and horário de término auto-computed (FR-009, acceptance 2). Only
   **ACTIVE** services appear; the INACTIVE one does not (FR-011, acceptance 5).
3. Save without serviço or cliente → blocked with pt-BR field messages (FR-008, acceptance 6).
4. Fill cliente (nome + telefone) + serviço → save. Appears immediately with status **Agendado**
   (FR-014, acceptance 3).
5. **Overlap (SC-004, FR-010)**: try to create a second appointment overlapping the first for the
   same professional → `409` conflito de horário (acceptance 4). To exercise the DB guarantee, fire
   two overlapping creates concurrently (e.g. two DevTools calls) → at most one succeeds; the other
   gets `409` from the `EXCLUDE` constraint (research §3, Edge Case #1).
6. Edge: pick a slot whose remaining gap is shorter than the service duration → blocked as conflict
   (Edge Case #6). Try a past slot → blocked (FR-013). Try a professional set INACTIVE → blocked
   (FR-012, Edge Case #2).

## Scenario 4 — Reschedule (P2 / US4, FR-015…FR-018, SC-006)

1. Open a **SCHEDULED** appointment → reschedule to a free time same day → moves to the new position,
   old slot freed (acceptance 1).
2. Reschedule onto another appointment's time → `409` conflito (acceptance 2, FR-016).
3. As OWNER/ADMIN, reschedule to a **different professional** → now appears in that professional's
   agenda (acceptance 3, FR-015).
4. Open the appointment detail → history shows previous + new horário (and previous/new professional
   when changed) (acceptance 4, FR-018, SC-006).
5. Try to reschedule a **CANCELLED** or **COMPLETED** appointment → blocked (acceptance 5, FR-017).

## Scenario 5 — Cancel (P2 / US5, FR-019…FR-023, SC-006)

1. On a SCHEDULED appointment click **Cancelar** → an explicit confirmation is required (FR-020).
   Optionally enter a motivo → confirm. Status → **Cancelado**, slot freed for new bookings
   (acceptance 1, FR-019).
2. The cancelled appointment is visually distinct or hidden under the default filter, retrievable via
   "mostrar cancelados" (FR-023, acceptance 2).
3. Detail history records the motivo (if given) + timestamp (acceptance 3, FR-022, SC-006).
4. Try to cancel an already CANCELLED/COMPLETED appointment → blocked (acceptance 4, FR-021).

## Scenario 6 — Business hours (P3 / US6, FR-026…FR-028, SC-007)

1. Fresh workspace with no config → grid uses **08:00–18:00 every day** (FR-027, acceptance 1).
2. As OWNER/ADMIN, in `/dashboard/configuracoes` set horário `09:00–20:00` and open weekdays
   seg–sex → grid and validations reflect it immediately (acceptance 2, FR-026).
3. Mark a weekday **fechado** → creating/rescheduling on that day is blocked with a pt-BR "fechado"
   message (acceptance 3, US6.3, SC-007). Confirm out-of-hours creation is blocked too (FR-028).

## Tenant-isolation & permission checks (Constitution I — priority manual scenarios)

- `GET/PATCH/DELETE /api/workspace/appointments/<id-from-another-workspace>` → `404`, never leaks.
- `POST /api/workspace/appointments` with a `serviceId`/`professionalId` from another workspace →
  `404`/`409`, never writes cross-tenant.
- MEMBER acting on another professional's agenda (any verb) → `403` (SC-005).
- `PUT /api/workspace/business-hours` as a MEMBER → `403`; as OWNER/ADMIN → `200`.

## Done when

- All six scenarios pass; overlap is impossible even under concurrent create (SC-004); MEMBER cross-
  professional access is blocked (SC-005); reschedule/cancel always leave a complete history entry
  (SC-006); out-of-hours/closed-day bookings are blocked (SC-007); and `npx tsc --noEmit` +
  `npm run lint` pass (Constitution quality gate). Verified at a mobile viewport first (Constitution IX).
