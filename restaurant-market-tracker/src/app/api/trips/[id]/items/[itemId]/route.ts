// API: edit or remove a single trip line.
//
// Each field belongs to a role and to a stage of the workflow:
//   the store manager sets approved quantities and drops lines
//   the admin does the same while the list is with them for approval
//   only the store manager records purchase quantity and price
//   only the kitchen confirms what actually arrived

import { NextRequest, NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getDb } from "@/lib/d1-context";
import {
  deleteTripItem,
  getTripItemById,
  getTripRow,
  logTripEvent,
  updateTripItem,
} from "@/lib/trips";
import type { Role, TripStatus } from "@/lib/types";

const FIELD_ROLES: Record<string, Role[]> = {
  requested_qty: ["kitchen", "store", "admin"],
  notes: ["kitchen", "store", "admin"],
  approved_qty: ["store", "admin"],
  status: ["store", "admin"],
  name: ["store", "admin"],
  unit: ["store", "admin"],
  purchased_qty: ["store", "admin"],
  unit_price: ["store", "admin"],
  received_qty: ["kitchen", "admin"],
};

const ORDER_EDIT_STATUSES: TripStatus[] = [
  "collecting",
  "reviewing",
  "pending_approval",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;
  const { person } = auth;

  const { id: tripId, itemId } = await params;
  const body = await request.json();

  const db = await getDb();
  const trip = await getTripRow(db, tripId);
  const item = await getTripItemById(db, itemId);

  if (!trip || !item || item.trip_id !== tripId) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  for (const key of Object.keys(body)) {
    const allowed = FIELD_ROLES[key];
    if (!allowed) {
      return NextResponse.json(
        { error: `Cannot change "${key}"` },
        { status: 400 },
      );
    }
    if (!allowed.includes(person.role)) {
      return NextResponse.json(
        { error: "Your role cannot change that" },
        { status: 403 },
      );
    }
  }

  const changes = body as Record<string, number | string | null>;
  const touches = (k: string) => changes[k] !== undefined;

  if (touches("purchased_qty") || touches("unit_price")) {
    if (trip.status !== "purchasing") {
      return NextResponse.json(
        { error: "Prices can only be entered while buying" },
        { status: 409 },
      );
    }
  }
  if (touches("received_qty") && trip.status !== "purchased") {
    return NextResponse.json(
      { error: "Deliveries are confirmed once the shopping is done" },
      { status: 409 },
    );
  }
  if (touches("approved_qty") || touches("status")) {
    if (!ORDER_EDIT_STATUSES.includes(trip.status)) {
      return NextResponse.json(
        { error: "The list is locked at this stage" },
        { status: 409 },
      );
    }
    // While the admin holds the list, nobody else should move it.
    if (trip.status === "pending_approval" && person.role !== "admin") {
      return NextResponse.json(
        { error: "This list is with the admin for approval" },
        { status: 409 },
      );
    }
  }

  // Approval sets the quantity the store manager will buy.
  if (changes.status === "approved" && changes.approved_qty === undefined) {
    changes.approved_qty = item.approved_qty ?? item.requested_qty;
  }

  await updateTripItem(db, itemId, changes);

  if (changes.status === "dropped") {
    await logTripEvent(db, tripId, person.id, "item_dropped", item.name);
  } else if (changes.status === "approved") {
    await logTripEvent(
      db,
      tripId,
      person.id,
      "item_approved",
      `${item.name} × ${changes.approved_qty} ${item.unit}`,
    );
  } else if (touches("received_qty")) {
    await logTripEvent(
      db,
      tripId,
      person.id,
      "item_received",
      `${item.name} — ${changes.received_qty} ${item.unit}`,
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;
  const { person } = auth;

  const { id: tripId, itemId } = await params;
  const db = await getDb();

  const trip = await getTripRow(db, tripId);
  const item = await getTripItemById(db, itemId);
  if (!trip || !item || item.trip_id !== tripId) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  const canManage = person.role === "store" || person.role === "admin";
  const ownRequest =
    person.role === "kitchen" &&
    item.requested_by === person.id &&
    trip.status === "collecting";

  if (!canManage && !ownRequest) {
    return NextResponse.json(
      { error: "You cannot remove this line" },
      { status: 403 },
    );
  }
  if (!ORDER_EDIT_STATUSES.includes(trip.status)) {
    return NextResponse.json(
      { error: "The list is locked at this stage" },
      { status: 409 },
    );
  }

  await deleteTripItem(db, itemId);
  await logTripEvent(db, tripId, person.id, "item_removed", item.name);

  return NextResponse.json({ success: true });
}
