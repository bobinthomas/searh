// Deterministic date formatting.
//
// Locale-aware formatting (toLocaleDateString with an undefined locale) must not
// be used for anything rendered on both the server and the client: Node and the
// browser can resolve the default locale differently — the server produced
// "Friday, 25 Sept" while the browser produced "Friday, Sep 25", which React
// reports as a hydration mismatch. These helpers return the same string
// everywhere, with no ICU dependency.

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Parses a YYYY-MM-DD calendar date without any timezone shift. */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "Friday, 25 Sep" — for a trip's market day. */
export function formatDayDate(iso: string): string {
  const d = parseDateOnly(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Fri 25 Sep" — for compact lists. */
export function formatDayDateShort(iso: string): string {
  const d = parseDateOnly(iso);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "25 Sep 2026" — for full timestamps such as purchase dates. */
export function formatShortDate(value: string): string {
  const d = parseTimestamp(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * "25 Sep 2026, 10:42" rendered in a fixed timezone (the configured company
 * timezone), so every viewer sees the same wall-clock time — safe for SSR with
 * no hydration risk. Add `suppressHydrationWarning` if mixing with
 * formatTimestamp on the same element.
 */
export function formatTimestampIn(tz: string, value: string): string {
  const d = parseTimestamp(value);
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`;
  } catch {
    return formatShortDate(value);
  }
}

/**
 * "Today" / "This week" boundaries in the company timezone, expressed as UTC
 * ISO strings for SQL comparisons. `weekStart` is 0 (Sunday) … 6 (Saturday).
 */
export function weekBoundsIn(tz: string, weekStart: number, now = new Date()): { start: Date } {
  // Resolve the current wall-clock date in the target timezone.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-").map(Number);
  const local = new Date(y, (m ?? 1) - 1, d ?? 1);
  const shift = (local.getDay() - weekStart + 7) % 7;
  local.setDate(local.getDate() - shift);
  return { start: local };
}

/**
 * SQLite's datetime('now') returns UTC with no marker, while values written from
 * JS are ISO strings that carry one. Normalise both before formatting.
 */
export function parseTimestamp(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`);
  }
  return new Date(value);
}

/**
 * "25 Sep, 10:42" in the viewer's local time.
 *
 * The server runs in UTC and the viewer may not, so this is only safe to render
 * inside an element marked `suppressHydrationWarning`.
 */
export function formatTimestamp(value: string): string {
  const d = parseTimestamp(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}
