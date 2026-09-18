// API: one trip, with its items and audit trail.

import { NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import { getTrip } from "@/lib/trips";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();
  const trip = await getTrip(db, id);

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  return NextResponse.json(trip);
}
