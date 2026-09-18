// API: who am I?

import { NextResponse } from "next/server";
import { getCurrentPerson } from "@/lib/auth";

export async function GET() {
  const person = await getCurrentPerson();
  if (!person) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({
    id: person.id,
    name: person.name,
    role: person.role,
  });
}
