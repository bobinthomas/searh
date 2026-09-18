// API: change your own PIN.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import { setPersonPin, verifyPin } from "@/lib/people";

export async function POST(request: NextRequest) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;
  const { person } = auth;

  const body = await request.json();
  const { current_pin, new_pin } = body as {
    current_pin?: string;
    new_pin?: string;
  };

  if (!/^\d{4}$/.test(new_pin ?? "")) {
    return NextResponse.json(
      { error: "The new PIN must be exactly 4 digits" },
      { status: 400 },
    );
  }

  const db = await getDb();
  if (!(await verifyPin(current_pin ?? "", person.pin_hash))) {
    return NextResponse.json(
      { error: "Your current PIN is not right" },
      { status: 401 },
    );
  }

  await setPersonPin(db, person.id, new_pin!);
  return NextResponse.json({ success: true });
}
