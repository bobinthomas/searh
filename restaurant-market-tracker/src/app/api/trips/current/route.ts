// API: the trip everyone is currently working on.
// Creates the next market trip on first use; off-day requests land here.

import { NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import { getTrip, getOrCreateCurrentTrip, NoMarketDayError } from "@/lib/trips";

export async function GET() {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const current = await getOrCreateCurrentTrip(db, auth.person.id);
    const trip = await getTrip(db, current.id);
    return NextResponse.json(trip);
  } catch (error) {
    if (error instanceof NoMarketDayError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
