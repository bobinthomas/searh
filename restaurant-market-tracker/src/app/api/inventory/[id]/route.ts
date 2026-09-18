// API: one inventory item.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson, requireRole } from "@/lib/auth";
import {
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
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

  await updateInventoryItem(db, id, body);
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
  await deleteInventoryItem(db, id);

  return NextResponse.json({ success: true });
}
