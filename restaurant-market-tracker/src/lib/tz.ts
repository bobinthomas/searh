// IANA timezone helpers.
//
// SQLite can only apply fixed hour offsets, and the app stores wall-clock
// settings as IANA zone names which follow DST. This resolves the zone to the
// offset in effect *right now* — good enough for spend bucketing, where the
// edge cases are purchases made within an hour of week boundaries.

/** Current UTC offset of an IANA zone, in hours (e.g. Sydney = 10 or 11). */
export function tzOffsetHours(timeZone: string): number {
  try {
    const now = new Date();
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const name = dtf.formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const match = name.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) / 60 : 0;
    return hours + Math.sign(hours) * minutes;
  } catch {
    return 0;
  }
}
