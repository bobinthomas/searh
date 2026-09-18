// API: delete a purchase record.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deletePurchase } from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();
  await deletePurchase(db, id);

  return NextResponse.json({ success: true });
}
