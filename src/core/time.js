// Time in core: instants are epoch milliseconds, the current time comes from a
// clock and local dates from a zone, both passed in (specification 13.2).

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/**
 * @typedef {object} Clock
 * @property {() => number} now The current time in epoch milliseconds.
 */

/**
 * A local calendar date.
 * @typedef {{ year: number, month: number, day: number }} LocalDate month 1–12
 */

/**
 * Turns instants into local dates.
 * @typedef {object} Zone
 * @property {(ms: number) => LocalDate} date
 */

/** A zone with a fixed offset from UTC, e.g. 0 for UTC or 120 for summer time in Poland. */
export function fixedZone(offsetMinutes = 0) {
  return {
    date(ms) {
      const shifted = new Date(ms + offsetMinutes * MINUTE_MS);
      return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
    },
  };
}

/** A named time zone with its daylight saving rules, e.g. 'Europe/Warsaw'. */
export function ianaZone(timeZone) {
  const format = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
  return {
    date(ms) {
      const parts = Object.fromEntries(format.formatToParts(ms).map((part) => [part.type, part.value]));
      return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
    },
  };
}

/** A local date as text, 'YYYY-MM-DD': comparable and fit for storage. */
export function isoDate({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Days between two instants, as a fraction. */
export function daysBetween(from, to) {
  return (to - from) / DAY_MS;
}

/** Whole minutes, every started one counted ("14 min" for 13 min 5 s). */
export function startedMinutes(ms) {
  return Math.ceil(ms / MINUTE_MS);
}
