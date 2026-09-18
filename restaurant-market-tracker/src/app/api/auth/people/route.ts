// API: the name picker on the sign-in screen.
// Public by design — it returns only names and roles, never PIN material.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/d1-context";
import { listPeople } from "@/lib/people";

export async function GET() {
  try {
    const db = await getDb();
    const people = await listPeople(db);
    return NextResponse.json(
      people.map((p) => ({ id: p.id, name: p.name, role: p.role })),
    );
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
