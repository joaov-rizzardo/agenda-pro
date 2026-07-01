/**
 * Pure scheduling business rules (research §3/§8). These are the single source of
 * truth for the create/reschedule validations enforced server-side in
 * `lib/workspace/appointment-service.ts` (the client mirrors them only as UX
 * niceties — Constitution VII/VIII).
 *
 * Times are wall-clock instants encoded in UTC components (research §4), matching
 * `lib/agenda/time-grid.ts`.
 */

export type BusinessHoursWindow = {
  openMinutes: number;
  closeMinutes: number;
  openWeekdays: number[];
};

/** FR-013: a start strictly before "now" is in the past. */
export function isPastStart(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() < now.getTime();
}

/** FR-009: end time is derived from the service duration, never client-trusted. */
export function computeEndsAt(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

/** FR-010: half-open interval overlap — `[aStart, aEnd)` intersects `[bStart, bEnd)`. */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

/**
 * FR-002a/FR-028: the whole `[startsAt, endsAt)` interval must fall within the
 * workspace business hours on an open weekday. Duration is measured absolutely so
 * an appointment that would run past midnight is (correctly) rejected as
 * out-of-hours rather than wrapping.
 */
export function isWithinBusinessHours(
  startsAt: Date,
  endsAt: Date,
  businessHours: BusinessHoursWindow
): boolean {
  const weekday = startsAt.getUTCDay();
  if (!businessHours.openWeekdays.includes(weekday)) {
    return false;
  }

  const startMinutes = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();
  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  const endMinutes = startMinutes + durationMinutes;

  return (
    startMinutes >= businessHours.openMinutes &&
    endMinutes <= businessHours.closeMinutes
  );
}
