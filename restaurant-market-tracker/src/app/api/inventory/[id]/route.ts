// API: one inventory item.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson, requireRole } from "@/lib/auth";
import {
  getInventoryItem,
  updateInventoryItem,
  archiveInventoryItem,
} from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();
  const item = await getInventoryItem(db, id);

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();
  const body = await request.json();

  // Only these fields are editable; never pass raw body straight to SQL.
  const allowed = [
    "name",
    "category",
    "unit",
    "current_quantity",
    "min_quantity",
    "kitchen_tracked",
    "store",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  if ("store" in patch) {
    patch.store = String(patch.store ?? "").trim() || null;
  }

  await updateInventoryItem(db, id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();
  // Archived, not deleted: a real DELETE cascades into purchase_history.
  if (!(await archiveInventoryItem(db, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
