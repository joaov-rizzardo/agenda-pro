/**
 * Pure grid / day-navigation helpers for the professional agenda (research §1/§5).
 *
 * Times are treated as **workspace wall-clock instants encoded in UTC components**
 * (research §4): a 09:00 booking is stored/compared as a `Date` whose UTC hour is
 * 9. Every time-of-day computation here therefore reads the UTC getters so the grid,
 * the business-hours math and the server validation all agree without any timezone
 * conversion. No date library is used.
 */

export const SLOT_MINUTES = 15;

/** Minutes-from-midnight (wall-clock/UTC) of a `Date`. */
export function minutesSinceMidnight(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/** Weekday of a day, `0 = domingo … 6 = sábado` (matches `openWeekdays`). */
export function weekdayOf(day: Date): number {
  return day.getUTCDay();
}

/**
 * The 15-minute slot start minutes for a business day: `openMinutes` (inclusive)
 * up to `closeMinutes` (exclusive), stepping by `SLOT_MINUTES`.
 */
export function buildDaySlots(openMinutes: number, closeMinutes: number): number[] {
  const slots: number[] = [];
  for (let m = openMinutes; m < closeMinutes; m += SLOT_MINUTES) {
    slots.push(m);
  }
  return slots;
}

/**
 * Whole-hour boundary minutes within `[openMinutes, closeMinutes]` for the left
 * hour rail labels (e.g. 480, 540 … 1080 for 08:00–18:00).
 */
export function buildHourMarks(openMinutes: number, closeMinutes: number): number[] {
  const marks: number[] = [];
  const first = Math.ceil(openMinutes / 60) * 60;
  for (let m = first; m <= closeMinutes; m += 60) {
    marks.push(m);
  }
  return marks;
}

/**
 * An appointment block's `top` offset and `height` as percentages of the
 * business-hours window, for absolute positioning on the slot surface (research §5).
 */
export function computeBlockPosition(
  startsAt: Date,
  endsAt: Date,
  openMinutes: number,
  closeMinutes: number
): { top: number; height: number } {
  const total = closeMinutes - openMinutes;
  if (total <= 0) {
    return { top: 0, height: 0 };
  }
  const start = minutesSinceMidnight(startsAt);
  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  const top = ((start - openMinutes) / total) * 100;
  const height = (durationMinutes / total) * 100;
  return { top, height };
}

/** `HH:MM` label for minutes-from-midnight. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** UTC midnight of the caller's local "today" (the day the user calls today). */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Step a day (UTC midnight) by `delta` days, returning a new day at UTC midnight. */
export function addDays(day: Date, delta: number): Date {
  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + delta)
  );
}

/** `YYYY-MM-DD` key for a day (used as the `date` query param). */
export function toDateKey(day: Date): string {
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a `YYYY-MM-DD` key back to a day at UTC midnight. */
export function dateKeyToDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * A wall-clock instant for `minutes`-from-midnight on `day`, as UTC components
 * (the shape the API expects for `startsAt` — research §4).
 */
export function slotToDate(day: Date, minutes: number): Date {
  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, minutes)
  );
}
