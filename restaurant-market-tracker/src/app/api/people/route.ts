// API: manage staff. Admin only.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import { createPerson, listPeople } from "@/lib/people";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["kitchen", "store", "admin"];

export async function GET() {
  const auth = await requireRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const db = await getDb();
  const people = await listPeople(db, true);
  return NextResponse.json(people);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { name, role, pin } = body as {
    name?: string;
    role?: Role;
    pin?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Pick a valid role" }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin ?? "")) {
    return NextResponse.json(
      { error: "PIN must be exactly 4 digits" },
      { status: 400 },
    );
  }

  const db = await getDb();
  const id = await createPerson(db, { name: name.trim(), role, pin: pin! });
  return NextResponse.json({ id, success: true }, { status: 201 });
}
