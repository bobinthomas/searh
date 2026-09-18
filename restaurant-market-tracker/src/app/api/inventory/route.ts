// API: inventory list and creation.
// Everyone can read inventory (kitchen needs it to report ran-outs);
// only the store manager and admin can change item definitions.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson, requireRole } from "@/lib/auth";
import { getAllInventory, createInventoryItem } from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function GET() {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    return NextResponse.json(await getAllInventory(db));
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const body = await request.json();
    const { name, category, unit, current_quantity, min_quantity, kitchen_tracked } = body;

    if (!name || !unit) {
      return NextResponse.json(
        { error: "name and unit are required" },
        { status: 400 },
      );
    }

    const id = await createInventoryItem(db, {
      name,
      category: category || "Other",
      unit,
      current_quantity: current_quantity ?? 0,
      min_quantity: min_quantity ?? 0,
      kitchen_tracked: kitchen_tracked === 0 ? 0 : 1,
    });

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
