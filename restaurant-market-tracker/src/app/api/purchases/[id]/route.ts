// API: delete a purchase record.
//
// A record posted from a trip also added stock; deletePurchase takes that
// back off, and the trip's history notes who removed it.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deletePurchase } from "@/lib/db";
import { getDb } from "@/lib/d1-context";
import { logTripEvent } from "@/lib/trips";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;
  const { person } = auth;

  const { id } = await params;
  const db = await getDb();
  const removed = await deletePurchase(db, id);
  if (!removed) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  if (removed.tripId) {
    await logTripEvent(
      db,
      removed.tripId,
      person.id,
      "purchase_deleted",
      `${removed.itemName} × ${removed.quantity} ${removed.unit}`,
    );
  }

  return NextResponse.json({ success: true });
}
