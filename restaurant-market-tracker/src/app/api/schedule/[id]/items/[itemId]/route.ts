// API: change or remove an item on a market day.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { updateMarketItem, removeMarketItem } from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { itemId } = await params;
  const db = await getDb();
  const body = await request.json();

  await updateMarketItem(db, itemId, body.default_quantity);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { itemId } = await params;
  const db = await getDb();

  await removeMarketItem(db, itemId);
  return NextResponse.json({ success: true });
}
