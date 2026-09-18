// API: move a trip through the workflow.
//
// The allowed transitions and the roles that may run them both live in
// TRANSITIONS (src/lib/types.ts), so this route cannot drift from the UI.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import { applyTransition, getTrip } from "@/lib/trips";
import { TRANSITIONS, type TripAction } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;
  const { person } = auth;

  const { id } = await params;
  const body = await request.json();
  const { action, note } = body as { action?: TripAction; note?: string };

  if (!action || !(action in TRANSITIONS)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const db = await getDb();
  const result = await applyTransition(db, id, action, person, note ?? "");

  if (!result.ok) {
    const status = result.error === "Your role cannot do that" ? 403 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  const trip = await getTrip(db, id);
  return NextResponse.json(trip);
}
