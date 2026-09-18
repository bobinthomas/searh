// Market trips: the list that moves from collecting → received.

import { d1All, d1First, d1Run, type D1Client } from "./db";
import { getSettings } from "./settings";
import {
  TRANSITIONS,
  type MarketTrip,
  type Person,
  type TripAction,
  type TripEvent,
  type TripItem,
  type TripItemSource,
  type TripStatus,
} from "./types";

export class NoMarketDayError extends Error {
  constructor() {
    super(
      "No market days are set up yet. Add your market days on the Schedule page first.",
    );
    this.name = "NoMarketDayError";
  }
}

function newId(): string {
  return crypto.randomUUID();
}

/** Local calendar date as YYYY-MM-DD (avoids UTC day-shift). */
function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ─── Reads ──────────────────────────────────────────────────

async function getTripByDate(
  db: D1Client,
  tripDate: string,
): Promise<MarketTrip | null> {
  return d1First<MarketTrip>(
    db,
    "SELECT * FROM market_trips WHERE trip_date = ?",
    tripDate,
  );
}

export async function getTripRow(
  db: D1Client,
  id: string,
): Promise<MarketTrip | null> {
  return d1First<MarketTrip>(
    db,
    `SELECT t.*, p.name AS approved_by_name
     FROM market_trips t
     LEFT JOIN people p ON p.id = t.approved_by
     WHERE t.id = ?`,
    id,
  );
}

export async function getTripItems(
  db: D1Client,
  tripId: string,
): Promise<TripItem[]> {
  return d1All<TripItem>(
    db,
    `SELECT ti.*, ii.current_quantity, ii.min_quantity, ii.category,
            p.name AS requested_by_name
     FROM trip_items ti
     LEFT JOIN inventory_items ii ON ii.id = ti.inventory_item_id
     LEFT JOIN people p ON p.id = ti.requested_by
     WHERE ti.trip_id = ?
     ORDER BY ti.created_at, ti.name`,
    tripId,
  );
}

export async function getTripEvents(
  db: D1Client,
  tripId: string,
): Promise<TripEvent[]> {
  return d1All<TripEvent>(
    db,
    `SELECT e.*, p.name AS person_name
     FROM trip_events e
     LEFT JOIN people p ON p.id = e.person_id
     WHERE e.trip_id = ?
     ORDER BY e.created_at DESC, e.rowid DESC`,
    tripId,
  );
}

/** Full trip with items and history, ready for the UI. */
export async function getTrip(
  db: D1Client,
  id: string,
): Promise<MarketTrip | null> {
  const trip = await getTripRow(db, id);
  if (!trip) return null;

  const [items, events] = await Promise.all([
    getTripItems(db, id),
    getTripEvents(db, id),
  ]);

  return { ...trip, items, events };
}

export async function listTrips(
  db: D1Client,
  limit = 20,
): Promise<MarketTrip[]> {
  return d1All<MarketTrip>(
    db,
    `SELECT t.*, p.name AS approved_by_name,
            (SELECT COUNT(*) FROM trip_items ti
              WHERE ti.trip_id = t.id AND ti.status <> 'dropped') AS item_count
     FROM market_trips t
     LEFT JOIN people p ON p.id = t.approved_by
     ORDER BY t.trip_date DESC
     LIMIT ?`,
    limit,
  );
}

export async function logTripEvent(
  db: D1Client,
  tripId: string,
  personId: string | null,
  action: string,
  note = "",
): Promise<void> {
  await d1Run(
    db,
    `INSERT INTO trip_events (id, trip_id, person_id, action, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId(),
    tripId,
    personId,
    action,
    note,
    // Written from JS so the value always carries a timezone marker.
    new Date().toISOString(),
  );
}

// ─── Auto items ─────────────────────────────────────────────

/**
 * Pulls the day's scheduled items and any low-stock items onto the trip.
 * Idempotent: the partial unique index on (trip_id, inventory_item_id) makes
 * repeated calls safe, so this can run every time a collecting trip is read.
 */
export async function materializeAutoItems(
  db: D1Client,
  tripId: string,
  dayOfWeek: number,
): Promise<void> {
  await d1Run(
    db,
    `INSERT OR IGNORE INTO trip_items
       (id, trip_id, inventory_item_id, name, unit, source, requested_qty)
     SELECT lower(hex(randomblob(16))), ?, ii.id, ii.name, ii.unit,
            'auto_schedule', mi.default_quantity
     FROM market_items mi
     JOIN inventory_items ii ON ii.id = mi.inventory_item_id
     WHERE mi.is_active = 1
       AND mi.market_day_id IN (SELECT id FROM market_days WHERE day_of_week = ?)`,
    tripId,
    dayOfWeek,
  );

  await d1Run(
    db,
    `INSERT OR IGNORE INTO trip_items
       (id, trip_id, inventory_item_id, name, unit, source, requested_qty)
     SELECT lower(hex(randomblob(16))), ?, ii.id, ii.name, ii.unit,
            'auto_low_stock', MAX(ii.min_quantity, 1)
     FROM inventory_items ii
     WHERE ii.min_quantity > 0 AND ii.current_quantity <= ii.min_quantity
       AND ii.kitchen_tracked = 1`,
    tripId,
  );
}

// ─── Current trip ───────────────────────────────────────────

/**
 * The trip everyone is working on: the next market day that hasn't been
 * received yet. Requests raised on a non-market day land here, so nothing is
 * lost between trips.
 */
export async function getOrCreateCurrentTrip(
  db: D1Client,
  personId: string | null,
): Promise<MarketTrip> {
  const days = await d1All<{ id: string; day_of_week: number }>(
    db,
    "SELECT id, day_of_week FROM market_days ORDER BY day_of_week",
  );
  if (days.length === 0) throw new NoMarketDayError();

  const marketDows = new Set(days.map((d) => d.day_of_week));
  const today = new Date();

  // Scan forward up to two weeks so a finished week rolls into the next one.
  for (let offset = 0; offset < 14; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);

    const dow = date.getDay();
    if (!marketDows.has(dow)) continue;

    const tripDate = isoDate(date);
    const existing = await getTripByDate(db, tripDate);

    if (existing) {
      // A finished trip stays closed; keep looking for the next open one.
      if (existing.status === "received") continue;
      await refreshTrip(db, existing.id, dow, existing.status);
      return existing;
    }

    const day = days.find((d) => d.day_of_week === dow);
    const id = newId();
    await d1Run(
      db,
      `INSERT INTO market_trips (id, market_day_id, trip_date, status, created_by)
       VALUES (?, ?, ?, 'collecting', ?)`,
      id,
      day?.id ?? null,
      tripDate,
      personId,
    );
    await materializeAutoItems(db, id, dow);
    await logTripEvent(db, id, personId, "trip_created", tripDate);

    const created = await getTripRow(db, id);
    if (!created) throw new Error("Failed to create trip");
    return created;
  }

  throw new NoMarketDayError();
}

async function refreshTrip(
  db: D1Client,
  tripId: string,
  dayOfWeek: number,
  status: TripStatus,
): Promise<void> {
  // Keep suggestions current while the list is still being built.
  if (status === "collecting" || status === "reviewing") {
    await materializeAutoItems(db, tripId, dayOfWeek);
  }
}

// ─── Item edits ─────────────────────────────────────────────

export async function findTripItem(
  db: D1Client,
  tripId: string,
  inventoryItemId: string,
): Promise<TripItem | null> {
  return d1First<TripItem>(
    db,
    "SELECT * FROM trip_items WHERE trip_id = ? AND inventory_item_id = ?",
    tripId,
    inventoryItemId,
  );
}

export async function insertTripItem(
  db: D1Client,
  input: {
    tripId: string;
    inventoryItemId: string | null;
    name: string;
    unit: string;
    source: TripItemSource;
    requestedQty: number;
    notes?: string;
    requestedBy: string | null;
  },
): Promise<string> {
  const id = newId();
  await d1Run(
    db,
    `INSERT INTO trip_items
       (id, trip_id, inventory_item_id, name, unit, source, requested_qty, notes, requested_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.tripId,
    input.inventoryItemId,
    input.name,
    input.unit,
    input.source,
    input.requestedQty,
    input.notes ?? "",
    input.requestedBy,
  );
  return id;
}

export async function updateTripItem(
  db: D1Client,
  itemId: string,
  fields: Partial<{
    name: string;
    unit: string;
    requested_qty: number;
    approved_qty: number | null;
    purchased_qty: number | null;
    received_qty: number | null;
    unit_price: number | null;
    status: string;
    notes: string;
  }>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(value);
  }
  if (sets.length === 0) return;

  values.push(itemId);
  await d1Run(
    db,
    `UPDATE trip_items SET ${sets.join(", ")}, updated_at = datetime('now')
     WHERE id = ?`,
    ...values,
  );
}

export async function getTripItemById(
  db: D1Client,
  itemId: string,
): Promise<TripItem | null> {
  return d1First<TripItem>(db, "SELECT * FROM trip_items WHERE id = ?", itemId);
}

export async function deleteTripItem(
  db: D1Client,
  itemId: string,
): Promise<void> {
  await d1Run(db, "DELETE FROM trip_items WHERE id = ?", itemId);
}

// ─── Transitions ────────────────────────────────────────────

export interface TransitionResult {
  ok: boolean;
  error?: string;
  status?: TripStatus;
}

/**
 * The single entry point for moving a trip forward. Enforces the allowed
 * source status and the acting role, applies side effects, and logs the event.
 */
/** Estimated cost of a list for the auto-approve ceiling: each line's
 * approved (or requested) quantity × the item's most recent purchase price.
 * Lines never bought before count as 0, so a list of all-new items will not
 * auto-approve unless the ceiling is very high. */
async function tripEstimateTotal(db: D1Client, tripId: string): Promise<number> {
  const row = await d1First<{ total: number | null }>(
    db,
    `SELECT COALESCE(SUM(COALESCE(ti.approved_qty, ti.requested_qty) * lp.price), 0) AS total
     FROM trip_items ti
     LEFT JOIN (
       SELECT inventory_item_id, unit_price AS price
       FROM purchase_history ph
       WHERE ph.unit_price > 0
         AND ph.purchased_at = (
           SELECT MAX(ph2.purchased_at) FROM purchase_history ph2
           WHERE ph2.inventory_item_id = ph.inventory_item_id AND ph2.unit_price > 0
         )
     ) lp ON lp.inventory_item_id = ti.inventory_item_id
     WHERE ti.trip_id = ? AND ti.status != 'dropped'`,
    tripId,
  );
  return row?.total ?? 0;
}

export async function applyTransition(
  db: D1Client,
  tripId: string,
  action: TripAction,
  person: Person,
  note = "",
): Promise<TransitionResult> {
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, error: "Unknown action" };
  if (!rule.roles.includes(person.role)) {
    return { ok: false, error: "Your role cannot do that" };
  }

  const trip = await getTripRow(db, tripId);
  if (!trip) return { ok: false, error: "Trip not found" };
  if (!rule.from.includes(trip.status)) {
    return {
      ok: false,
      error: `Cannot ${rule.label.toLowerCase()} while the list is "${trip.status}"`,
    };
  }

  if (action === "send_back" && !note.trim()) {
    return { ok: false, error: "Add a comment explaining what to change" };
  }

  // Approval settings: when the admin turns approval off (or sets an
  // auto-approve ceiling), submit_for_approval short-circuits to approved.
  if (action === "submit_for_approval") {
    const settings = await getSettings(db);
    const estimate = await tripEstimateTotal(db, tripId);
    const skipApproval =
      settings.require_approval === "0" ||
      (Number(settings.auto_approve_under) > 0 &&
        estimate < Number(settings.auto_approve_under));
    if (skipApproval) {
      const sets: string[] = ["status = ?", "updated_at = datetime('now')"];
      const values: unknown[] = ["approved", person.id, new Date().toISOString()];
      values.push(tripId);
      await d1Run(
        db,
        `UPDATE market_trips SET ${sets.join(", ")}, approved_by = ?, approved_at = ? WHERE id = ?`,
        ...values,
      );
      await logTripEvent(
        db,
        tripId,
        person.id,
        "auto_approved",
        `List of ${estimate} auto-approved (approval not required)`,
      );
      return { ok: true, status: "approved" };
    }
  }

  if (action === "complete_purchase") {
    await postPurchases(db, tripId, person.id);
  }
  if (action === "confirm_receipt") {
    await postReceipts(db, tripId);
  }

  const sets: string[] = ["status = ?", "updated_at = datetime('now')"];
  const values: unknown[] = [rule.to];

  if (action === "approve") {
    sets.push("approved_by = ?", "approved_at = ?", "rejection_note = ''");
    values.push(person.id, new Date().toISOString());
  }
  if (action === "send_back") {
    sets.push("rejection_note = ?");
    values.push(note.trim());
  }

  values.push(tripId);
  await d1Run(
    db,
    `UPDATE market_trips SET ${sets.join(", ")} WHERE id = ?`,
    ...values,
  );

  await logTripEvent(db, tripId, person.id, action, note.trim());
  return { ok: true, status: rule.to };
}

/**
 * Writes every purchased line into the ledger and bumps stock. Runs once per
 * line — `posted` guards against double counting if the list is re-submitted.
 */
async function postPurchases(
  db: D1Client,
  tripId: string,
  personId: string,
): Promise<void> {
  const trip = await getTripRow(db, tripId);
  const items = await getTripItems(db, tripId);

  for (const item of items) {
    if (item.posted === 1 || item.status === "dropped") continue;

    const qty = item.purchased_qty ?? item.approved_qty ?? item.requested_qty;
    if (!qty || qty <= 0) continue;

    let inventoryId = item.inventory_item_id;

    // An extra need that isn't in inventory yet becomes a tracked item.
    if (!inventoryId) {
      inventoryId = newId();
      await d1Run(
        db,
        `INSERT INTO inventory_items
           (id, name, category, unit, current_quantity, min_quantity)
         VALUES (?, ?, 'Other', ?, 0, 0)`,
        inventoryId,
        item.name,
        item.unit,
      );
      await d1Run(
        db,
        "UPDATE trip_items SET inventory_item_id = ? WHERE id = ?",
        inventoryId,
        item.id,
      );
    }

    await d1Run(
      db,
      `INSERT INTO purchase_history
         (id, inventory_item_id, market_day_id, quantity, unit_price, notes, purchased_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      inventoryId,
      trip?.market_day_id ?? null,
      qty,
      item.unit_price ?? 0,
      `Trip ${trip?.trip_date ?? ""}`.trim(),
      new Date().toISOString(),
    );

    await d1Run(
      db,
      `UPDATE inventory_items
       SET current_quantity = current_quantity + ?, updated_at = datetime('now')
       WHERE id = ?`,
      qty,
      inventoryId,
    );

    await d1Run(
      db,
      `UPDATE trip_items
       SET status = 'purchased', posted = 1, inventory_item_id = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      inventoryId,
      item.id,
    );
  }

  await logTripEvent(db, tripId, personId, "purchases_recorded");
}

/**
 * Applies what actually arrived. Any shortfall is taken back off stock and
 * recorded, so the books match the shelf.
 */
async function postReceipts(db: D1Client, tripId: string): Promise<void> {
  const items = await getTripItems(db, tripId);

  for (const item of items) {
    if (item.status === "dropped" || item.status === "received") continue;
    if (item.status !== "purchased") continue;

    const bought = item.purchased_qty ?? 0;
    const received = item.received_qty ?? bought;
    const missing = bought - received;

    if (missing > 0 && item.inventory_item_id) {
      await d1Run(
        db,
        `UPDATE inventory_items
         SET current_quantity = MAX(0, current_quantity - ?),
             updated_at = datetime('now')
         WHERE id = ?`,
        missing,
        item.inventory_item_id,
      );
      await logTripEvent(
        db,
        tripId,
        null,
        "short_delivery",
        `${item.name}: bought ${bought} ${item.unit}, received ${received} ${item.unit}`,
      );
    }

    await d1Run(
      db,
      `UPDATE trip_items
       SET status = 'received', received_qty = ?, updated_at = datetime('now')
       WHERE id = ?`,
      received,
      item.id,
    );
  }
}
