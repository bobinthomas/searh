// API: app settings. Anyone signed in can read; only admin writes.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import {
  getSettings,
  updateSettings,
  validateSettings,
} from "@/lib/settings";

export async function GET() {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    return NextResponse.json(await getSettings(db));
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;
  if (auth.person.role !== "admin") {
    return NextResponse.json({ error: "Only the admin can change settings" }, { status: 403 });
  }

  try {
    const db = await getDb();
    const body = await request.json();
    const result = validateSettings(body);
    if (typeof result === "string") {
      return NextResponse.json({ error: result }, { status: 400 });
    }
    await updateSettings(db, result, auth.person.id);
    return NextResponse.json(await getSettings(db));
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
