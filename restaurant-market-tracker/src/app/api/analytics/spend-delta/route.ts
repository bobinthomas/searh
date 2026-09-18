// API: this week vs last week spend, for the admin home card.

import { NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getWeekOverWeekSpend } from "@/lib/db";
import { getDb } from "@/lib/d1-context";
import { getSettings } from "@/lib/settings";
import { tzOffsetHours } from "@/lib/tz";

export async function GET() {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const settings = await getSettings(db);
    return NextResponse.json(
      await getWeekOverWeekSpend(
        db,
        tzOffsetHours(settings.timezone),
        Number(settings.week_start),
      ),
    );
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
