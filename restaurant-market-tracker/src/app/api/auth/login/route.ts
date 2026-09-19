// API: sign in with a person id + 4-digit PIN.

import { NextRequest, NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import {
  claimLoginAttempt,
  clearLoginAttempts,
  getPerson,
  verifyPin,
} from "@/lib/people";

export async function POST(request: NextRequest) {
  let body: { person_id?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { person_id, pin } = body;
  if (!person_id || !pin) {
    return NextResponse.json(
      { error: "Choose your name and enter your PIN" },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const wrongPin = () =>
      NextResponse.json({ error: "That PIN is not right" }, { status: 401 });

    const person = await getPerson(db, person_id);
    // Same message for unknown person and wrong PIN, so the picker can't be
    // used to probe who has an account.
    if (!person || person.active !== 1) return wrongPin();

    // Count the attempt before checking the PIN, so concurrent guesses
    // cannot all slip past the lockout.
    const { allowed } = await claimLoginAttempt(db, person.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many wrong PINs. Try again in a few minutes." },
        { status: 429 },
      );
    }

    if (!(await verifyPin(pin, person.pin_hash))) return wrongPin();

    await clearLoginAttempts(db, person.id);
    await startSession(person.id);

    return NextResponse.json({
      success: true,
      person: { id: person.id, name: person.name, role: person.role },
    });
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
