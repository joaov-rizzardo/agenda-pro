# Phase 0 Research: Agenda de Profissionais

All Technical Context unknowns from `plan.md` resolved below. Format per item:
**Decision / Rationale / Alternatives considered.**

## §1 — Date & time math without a date library

**Decision**: Use native `Date` for instants and `Intl.DateTimeFormat` (locale `pt-BR`) for all
user-facing date/time formatting. No date library (`date-fns`, `dayjs`, `luxon`) is added. A small
pure module `lib/agenda/time-grid.ts` provides the only helpers needed: build the list of 15-minute
slots for a day, convert a start time + duration to an end time, compute a block's top offset and
height in the grid, and step the selected day by ±1 / to "today".

**Rationale**: The scheduling domain here is deliberately narrow — a single-day vertical grid at
15-minute granularity, per the spec Assumptions. Everything required is minute arithmetic and
formatting, both of which native `Date`/`Intl` cover. The constitution discourages new dependencies
without justification (Tech Stack & Constraints), and no recurrence, parsing of arbitrary formats,
or cross-timezone arithmetic is in scope. Keeping it native avoids bundle weight on an authenticated
screen and avoids a version to maintain.

**Alternatives considered**: `date-fns` (clean API, tree-shakeable) — rejected as unnecessary weight
for minute math; `dayjs`/`luxon` — same, and `luxon` is heavier. Revisit only if week/month views or
per-professional recurring availability (explicitly out of scope) are added later.

## §2 — No new runtime dependency overall

**Decision**: Ship the feature with zero additions to `package.json`. All UI is shadcn/ui +
Tailwind tokens already vendored; all data flow is Prisma + Route Handlers + React Query already in
use; formatting is native `Intl`.

**Rationale**: Mirrors feature 007's outcome and keeps the Constitution Check clean. Every capability
this feature needs already exists in the repo.

**Alternatives considered**: A calendar component library (e.g. FullCalendar, react-big-calendar) —
rejected: heavy, opinionated styling that fights the design system (Constitution IV), and overkill
for a single-day single-professional grid. The bespoke grid (§5) is small and token-consistent.

## §3 — Guaranteeing 0% overlap (SC-004) under concurrency

**Decision**: Two layers. (a) An **application check inside a transaction**: on create/reschedule,
within `prisma.$transaction`, query for any `SCHEDULED` appointment of the same professional whose
interval overlaps the requested `[startsAt, endsAt)` (`startsAt < newEnd AND endsAt > newStart`) and
throw a typed conflict (`WorkspaceAuthError(409, "Este horário conflita com outro agendamento.")`) if
found. (b) A **database-level partial `EXCLUDE` constraint** as the true guarantee for the
simultaneous-write edge case (spec Edge Cases #1):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    "membershipId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" = 'SCHEDULED');
```

Prisma cannot express `EXCLUDE`, so this is appended as raw SQL to the generated migration file
(Constitution VI allows this as long as it lives in a checked-in migration, not a dashboard edit).
The service catches Postgres error code `23P01` (`exclusion_violation`) and maps it to the same
typed 409 as the application check.

**Rationale**: The application-level check alone loses the race in Edge Case #1 (two writers both
read "free", both insert). A partial `EXCLUDE` over `tsrange` scoped to `status = 'SCHEDULED'` makes
overlap structurally impossible for active appointments while still allowing a cancelled/completed
appointment to sit in the same slot as a new one — exactly the spec's freeing-the-slot semantics
(FR-019). This is what makes SC-004 *true*, not just tested.

**Alternatives considered**: Application-only check — rejected, cannot satisfy Edge Case #1.
`SELECT … FOR UPDATE` advisory locking per professional/day — workable but more code and still
weaker than a declarative constraint. A unique index on a start-time slot — rejected: appointments
have variable duration, so a single start-time key cannot represent an interval.

## §4 — Storing appointment times & business timezone

**Decision**: Store `startsAt`/`endsAt` as `DateTime` interpreted as **workspace wall-clock**
instants (the local booking time is what is persisted and compared). All server-side construction and
all grid/business-hours comparisons operate on those same values, so no timezone conversion is
performed anywhere in v1. There is no per-workspace timezone field yet; the product is single-region
(pt-BR). Business hours are stored as **minutes-from-midnight** (`openMinutes`, `closeMinutes`) and
**open weekdays** as an `Int[]` (`0 = domingo … 6 = sábado`), which are timezone-free by
construction.

**Rationale**: The spec never mentions multiple timezones and treats the grid as a wall-clock day.
Storing and comparing a single consistent wall-clock value avoids offset math that would otherwise
need a library (§1) and eliminates a whole class of DST/offset bugs for a same-region v1. Minutes and
weekday integers make business-hours comparison a trivial `slotMinutes >= openMinutes && slotEnd <=
closeMinutes && openWeekdays.includes(weekday)` with no date coupling.

**Alternatives considered**: Store UTC + a per-workspace IANA timezone and convert at the edges — the
correct long-term model, but it requires timezone conversion helpers (a library, §1) and a schema
field the spec doesn't call for. Deferred: documented as the future migration path when
multi-region or per-professional availability lands. Storing business hours as `DateTime` — rejected,
couples a time-of-day to an arbitrary date and reintroduces timezone ambiguity.

## §5 — Rendering the Teams-style time grid

**Decision**: Build the grid as a bespoke composition from Tailwind tokens + existing primitives, not
a calendar library (§2). Layout: a scrollable vertical column spanning the business day at 15-minute
resolution; a left hour rail labels each hour; the slot surface is a positioned container where each
appointment block is absolutely positioned via `top = (startMinutes − openMinutes) / totalMinutes`
and `height = durationMinutes / totalMinutes` (percentages), computed by `lib/agenda/time-grid.ts`.
Empty slots are click targets that open the create dialog pre-filled with that slot's start. Status
drives the block's token color (Agendado = primary, Concluído = muted/success, Cancelado =
struck/faded per FR-023, Não compareceu = warning). Mobile-first single column (Constitution IX),
widened on `md:+`.

**Rationale**: A single-professional single-day grid is a small, well-bounded layout; a library would
fight the design system (Constitution IV) and add weight. Percentage positioning off pure helpers
keeps all math testable and out of JSX (Constitution VII).

**Alternatives considered**: CSS grid rows per slot with appointments spanning rows — viable but
awkward for arbitrary 15-min-aligned durations and harder to animate; absolute positioning off a pure
helper is simpler and keeps logic in `lib/agenda/`. FullCalendar/react-big-calendar — see §2.

## §6 — Appointment history / audit trail

**Decision**: A dedicated `AppointmentEvent` table records every lifecycle change (created,
rescheduled, cancelled, status changed) with the fields needed by SC-006: previous/new start times,
previous/new professional (for cross-professional reschedule, FR-015/US4.3), optional reason (cancel,
FR-022), the acting user, and a timestamp. Events are written **in the same transaction** as the
mutation they describe, so history can never diverge from state.

**Rationale**: The spec repeatedly requires a durable history ("registra a alteração no histórico",
FR-018/FR-022, SC-006) and explicitly forgoes client notifications in v1 — the history *is* the
record the professional uses to contact the client manually (spec Assumptions). A separate append-only
table keeps `Appointment` clean and makes the history queryable per appointment. Writing it in the
mutation transaction guarantees SC-006's "100% recorded".

**Alternatives considered**: A JSON column on `Appointment` — rejected: harder to query, no
per-event row for future reporting, and awkward to append atomically. A generic cross-entity audit
log — rejected as over-engineered for one entity in v1.

## §7 — Authorization model: who may view/act on whose agenda

**Decision**: Reuse `requireWorkspaceRole` for the ACTIVE-membership gate, then add an explicit
**target-vs-self** rule in the appointment service/handlers: resolve the caller's membership; if the
requested `professionalId` (list) or the appointment's `membershipId` (detail/mutation) is **not the
caller's own membership**, require the caller's role to be OWNER or ADMIN — otherwise throw
`WorkspaceAuthError(403)`. A MEMBER may only read and mutate appointments whose professional is
themselves (FR-005/FR-007/FR-025). This check is server-side and independent of any client-sent role.

**Rationale**: Directly encodes US2's acceptance scenarios and FR-007/FR-025. Keeping it in the
service layer (not just the handler) means the guard travels with the logic and is enforced uniformly
across list/detail/reschedule/cancel.

**Alternatives considered**: Encoding the target professional only in the URL path and relying on
middleware — rejected: the role re-check must sit next to the data access to satisfy FR-007's "no
matter what the interface shows"; a query-param + service-layer guard is clearer and testable.

## §8 — Inactive service / professional & past-time rules

**Decision**: All enforced server-side in `lib/agenda/scheduling-rules.ts` + the appointment service:
creating/rescheduling re-checks that the target service is `ACTIVE` (FR-011) and the target
professional's membership is `ACTIVE` (FR-012) at write time; a start time strictly before "now"
(workspace wall-clock) is rejected (FR-013/FR-016). Existing appointments referencing a
later-deactivated service remain valid and visible (spec Edge Case #3) — the active check applies only
to new/rescheduled bookings, so the DTO reads the service snapshot regardless of its current status.

**Rationale**: Straight from FR-011/FR-012/FR-013 and Edge Cases #2/#3. Centralizing the rules in one
pure module keeps create and reschedule consistent (they share FR-010/FR-013 per FR-016) and out of
the handlers (Constitution VII).

**Alternatives considered**: Snapshotting service duration/price onto the appointment at creation —
partially adopted: `durationMinutes` is effectively fixed by the stored `startsAt`/`endsAt`, so a
later duration change to the service does not move existing appointments; price is out of scope for
this feature (no billing surface here).
