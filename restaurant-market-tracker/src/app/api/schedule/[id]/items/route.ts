// API: items assigned to a market day.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson, requireRole } from "@/lib/auth";
import { getMarketItemsByDay, addMarketItem } from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();

  return NextResponse.json(await getMarketItemsByDay(db, id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id: dayId } = await params;
  const db = await getDb();
  const body = await request.json();
  const { inventory_item_id, default_quantity } = body;

  if (!inventory_item_id) {
    return NextResponse.json(
      { error: "inventory_item_id is required" },
      { status: 400 },
    );
  }

  const id = await addMarketItem(
    db,
    dayId,
    inventory_item_id,
    default_quantity ?? 1,
  );
  return NextResponse.json({ id, success: true }, { status: 201 });
}
