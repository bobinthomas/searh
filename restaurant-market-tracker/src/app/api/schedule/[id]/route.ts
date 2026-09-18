// API: remove a market day.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deleteMarketDay } from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();

  await deleteMarketDay(db, id);
  return NextResponse.json({ success: true });
}
