// API: analytics rollups for the admin dashboard.
//
//   /api/analytics/trend?weeks=12   weekly spend totals, oldest first
//   /api/analytics/trend?...&from=&to=  (to is accepted for symmetry; weeks wins)
//
// Reads only — no role restriction beyond being signed in, same as History.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getSpendByCategory, getSpendTrend } from "@/lib/db";
import { getDb } from "@/lib/d1-context";
import { getSettings } from "@/lib/settings";
import { tzOffsetHours } from "@/lib/tz";

export async function GET(request: NextRequest) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const weeks = Math.min(52, Math.max(4, Number(searchParams.get("weeks")) || 12));
    const from = searchParams.get("from") || new Date(0).toISOString();
    const to = searchParams.get("to") || new Date().toISOString();

    const settings = await getSettings(db);
    const offset = tzOffsetHours(settings.timezone);
    // SQLite weekday N: 0=Sun..6=Sat — same numbering as the setting.
    const weekStartDow = Number(settings.week_start);

    const [trend, byCategory] = await Promise.all([
      getSpendTrend(db, weeks, offset, weekStartDow),
      getSpendByCategory(db, from, to),
    ]);

    return NextResponse.json({ trend, byCategory });
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
