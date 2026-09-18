// API: add a line to a trip.
//
//   kind "ran_out" -> kitchen tapped an existing inventory item
//   kind "extra"   -> free-text request for something not in inventory
//   kind "store"   -> store manager adding something (same shapes as above)
//
// Lines are attributable: a kitchen report and a store addition are stored with
// different sources so the UI can show where each came from.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import { getInventoryItem } from "@/lib/db";
import {
  findTripItem,
  getTripRow,
  insertTripItem,
  logTripEvent,
  updateTripItem,
} from "@/lib/trips";
import type { TripItemSource, TripStatus } from "@/lib/types";

/** Statuses in which the list can still be changed. */
const EDITABLE: TripStatus[] = ["collecting", "reviewing"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;
  const { person } = auth;

  const { id: tripId } = await params;
  const body = await request.json();
  const { kind, inventory_item_id, name, unit, requested_qty, notes } = body as {
    kind?: "ran_out" | "extra" | "store";
    inventory_item_id?: string;
    name?: string;
    unit?: string;
    requested_qty?: number;
    notes?: string;
  };

  const db = await getDb();

  const trip = await getTripRow(db, tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  if (!EDITABLE.includes(trip.status)) {
    return NextResponse.json(
      { error: "This list is locked while it is being approved or bought" },
      { status: 409 },
    );
  }

  const isStoreAction = kind === "store" || person.role !== "kitchen";
  const qty = Number(requested_qty) > 0 ? Number(requested_qty) : 1;

  let source: TripItemSource;
  let resolvedName = name?.trim() ?? "";
  let resolvedUnit = unit?.trim() ?? "";

  if (inventory_item_id) {
    const item = await getInventoryItem(db, inventory_item_id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    source = isStoreAction ? "store_added" : "kitchen_ran_out";
    resolvedName = item.name;
    resolvedUnit = item.unit;

    // Already on the list? Raise the requested quantity instead of duplicating.
    const existing = await findTripItem(db, tripId, inventory_item_id);
    if (existing) {
      await updateTripItem(db, existing.id, {
        requested_qty: Math.max(existing.requested_qty, qty),
      });
      await logTripEvent(
        db,
        tripId,
        person.id,
        "item_requested",
        `${resolvedName} × ${qty} ${resolvedUnit}`,
      );
      return NextResponse.json({ id: existing.id, merged: true });
    }
  } else {
    if (!resolvedName) {
      return NextResponse.json(
        { error: "Give the item a name" },
        { status: 400 },
      );
    }
    source = isStoreAction ? "store_added" : "kitchen_extra";
    resolvedUnit = resolvedUnit || "unit";
  }

  const id = await insertTripItem(db, {
    tripId,
    inventoryItemId: inventory_item_id ?? null,
    name: resolvedName,
    unit: resolvedUnit,
    source,
    requestedQty: qty,
    notes: notes ?? "",
    requestedBy: person.id,
  });

  await logTripEvent(
    db,
    tripId,
    person.id,
    "item_requested",
    `${resolvedName} × ${qty} ${resolvedUnit}`,
  );

  return NextResponse.json({ id, success: true }, { status: 201 });
}
