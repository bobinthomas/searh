// API: purchase ledger.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson, requireRole } from "@/lib/auth";
import {
  getAllPurchases,
  getPurchasesByDateRange,
  recordPurchase,
} from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function GET(request: NextRequest) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const purchases =
      from && to
        ? await getPurchasesByDateRange(db, from, to)
        : await getAllPurchases(db, 200);

    return NextResponse.json(purchases);
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
    const {
      inventory_item_id,
      quantity,
      unit_price,
      market_day_id,
      notes,
      purchased_at,
    } = body;

    if (!inventory_item_id || !quantity) {
      return NextResponse.json(
        { error: "inventory_item_id and quantity are required" },
        { status: 400 },
      );
    }

    const id = await recordPurchase(db, {
      inventory_item_id,
      quantity,
      unit_price: unit_price ?? 0,
      market_day_id,
      notes,
      purchased_at,
    });

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
