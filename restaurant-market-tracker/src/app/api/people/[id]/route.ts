// API: update or deactivate one staff member. Admin only.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import {
  setPersonPin,
  updatePerson,
  wouldRemoveLastAdmin,
} from "@/lib/people";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["kitchen", "store", "admin"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, role, active, pin } = body as {
    name?: string;
    role?: Role;
    active?: number;
    pin?: string;
  };

  if (role !== undefined && !ROLES.includes(role)) {
    return NextResponse.json({ error: "Pick a valid role" }, { status: 400 });
  }
  if (pin !== undefined && !/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN must be exactly 4 digits" },
      { status: 400 },
    );
  }

  const db = await getDb();

  // Never let the last admin lock everyone out of approvals.
  if (await wouldRemoveLastAdmin(db, id, { role, active })) {
    return NextResponse.json(
      { error: "This is the only admin — promote someone else first" },
      { status: 409 },
    );
  }

  await updatePerson(db, id, {
    name: name?.trim() || undefined,
    role,
    active,
  });
  if (pin) await setPersonPin(db, id, pin);

  return NextResponse.json({ success: true });
}

/** Deactivates rather than deletes, so the approval trail keeps its names. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();

  if (await wouldRemoveLastAdmin(db, id, { active: 0 })) {
    return NextResponse.json(
      { error: "This is the only admin — promote someone else first" },
      { status: 409 },
    );
  }

  await updatePerson(db, id, { active: 0 });
  return NextResponse.json({ success: true });
}
