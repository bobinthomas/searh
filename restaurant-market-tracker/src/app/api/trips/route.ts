// API: recent trips.

import { NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import { listTrips } from "@/lib/trips";

export async function GET() {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  const db = await getDb();
  const trips = await listTrips(db, 30);
  return NextResponse.json(trips);
}
