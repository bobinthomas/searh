// API: sign in with a person id + 4-digit PIN.

import { NextRequest, NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import {
  clearLoginAttempts,
  getPerson,
  loginLockedUntil,
  recordFailedLogin,
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

    const lockedUntil = await loginLockedUntil(db, person_id);
    if (lockedUntil) {
      return NextResponse.json(
        { error: "Too many wrong PINs. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const person = await getPerson(db, person_id);
    // Same message for unknown person and wrong PIN, so the picker can't be
    // used to probe who has an account.
    const ok = person
      ? person.active === 1 && (await verifyPin(pin, person.pin_hash))
      : false;

    if (!ok) {
      await recordFailedLogin(db, person_id);
      return NextResponse.json({ error: "That PIN is not right" }, { status: 401 });
    }

    await clearLoginAttempts(db, person_id);
    await startSession(person!.id);

    return NextResponse.json({
      success: true,
      person: { id: person!.id, name: person!.name, role: person!.role },
    });
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
