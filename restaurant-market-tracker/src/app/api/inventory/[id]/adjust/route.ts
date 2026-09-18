// API: adjust stock by a delta.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { adjustInventoryQuantity } from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();
  const body = await request.json();
  const { delta } = body;

  if (typeof delta !== "number") {
    return NextResponse.json(
      { error: "delta (number) is required" },
      { status: 400 },
    );
  }

  await adjustInventoryQuantity(db, id, delta);
  return NextResponse.json({ success: true });
}
