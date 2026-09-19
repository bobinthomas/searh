// Market trips: the list that moves from collecting → received.

import {
  changes,
  d1All,
  d1Batch,
  d1First,
  d1Run,
  d1Stmt,
  type D1Client,
  type D1PreparedStatement,
} from "./db";
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

/**
 * Today's calendar date in the company timezone, as a UTC-midnight Date so
 * day arithmetic and getUTCDay() never shift it. The Worker's clock is UTC,
 * which in Sydney is still "yesterday" until 10–11am.
 */
function todayIn(timeZone: string): Date {
  try {
    const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .split("-")
      .map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  } catch {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}

// ─── Reads ──────────────────────────────────────────────────

async function getTripByDate(
  db: D1Client,
  tripDate: string,
): Promise<MarketTrip | null> {
  return d1First<MarketTrip>(
    db,
    "SELECT * FROM market_trips WHERE trip_date = ? ORDER BY created_at LIMIT 1",
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
            COALESCE(ti.store, ii.store) AS store,
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
     WHERE mi.is_active = 1 AND ii.archived = 0
       AND mi.market_day_id IN (SELECT id FROM market_days WHERE day_of_week = ?)`,
    tripId,
    dayOfWeek,
  );

  await d1Run(
    db,
    `INSERT OR IGNORE INTO trip_items
       (id, trip_id, inventory_item_id, name, unit, source, requested_qty, store)
     SELECT lower(hex(randomblob(16))), ?, ii.id, ii.name, ii.unit,
            'auto_low_stock', MAX(ii.min_quantity, 1), ii.store
     FROM inventory_items ii
     WHERE ii.min_quantity > 0 AND ii.current_quantity <= ii.min_quantity
       AND ii.kitchen_tracked = 1 AND ii.archived = 0`,
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
  const { timezone } = await getSettings(db);
  const today = todayIn(timezone);

  // Scan forward up to two weeks so a finished week rolls into the next one.
  for (let offset = 0; offset < 14; offset++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);

    const dow = date.getUTCDay();
    if (!marketDows.has(dow)) continue;

    const tripDate = date.toISOString().slice(0, 10);
    const existing = await getTripByDate(db, tripDate);

    if (existing) {
      // A finished trip stays closed; keep looking for the next open one.
      if (existing.status === "received") continue;
      await refreshTrip(db, existing.id, dow, existing.status);
      return existing;
    }

    const day = days.find((d) => d.day_of_week === dow);
    const id = newId();
    // trip_date is unique: if another device created this trip a moment ago,
    // the insert is ignored and everyone shares that one list.
    const inserted = await d1Run(
      db,
      `INSERT OR IGNORE INTO market_trips (id, market_day_id, trip_date, status, created_by)
       VALUES (?, ?, ?, 'collecting', ?)`,
      id,
      day?.id ?? null,
      tripDate,
      personId,
    );
    if (changes(inserted) === 0) {
      const theirs = await getTripByDate(db, tripDate);
      if (theirs && theirs.status !== "received") return theirs;
      continue;
    }
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
    store?: string | null;
  },
): Promise<string> {
  const id = newId();
  await d1Run(
    db,
    `INSERT INTO trip_items
       (id, trip_id, inventory_item_id, name, unit, source, requested_qty, notes, requested_by, store)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.tripId,
    input.inventoryItemId,
    input.name,
    input.unit,
    input.source,
    input.requestedQty,
    input.notes ?? "",
    input.requestedBy,
    input.store ?? null,
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
    requested_by: string | null;
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

/** A trip-log entry to write once the transition has committed. */
interface PendingEvent {
  action: string;
  note: string;
  personId: string | null;
}

/** Estimated cost of a list for the auto-approve ceiling: each line's
 * approved (or requested) quantity × the item's most recent purchase price.
 * `unpriced` counts lines with nothing to price them by (never bought, or not
 * a stock item). Any such line makes the estimate incomplete, so the list
 * must not auto-approve on it. */
async function tripEstimate(
  db: D1Client,
  tripId: string,
): Promise<{ total: number; unpriced: number }> {
  const row = await d1First<{ total: number | null; unpriced: number | null }>(
    db,
    `SELECT COALESCE(SUM(qty * price), 0) AS total,
            SUM(CASE WHEN price IS NULL THEN 1 ELSE 0 END) AS unpriced
     FROM (
       SELECT COALESCE(ti.approved_qty, ti.requested_qty) AS qty,
              (SELECT ph.unit_price FROM purchase_history ph
                WHERE ph.inventory_item_id = ti.inventory_item_id
                  AND ph.unit_price > 0
                ORDER BY ph.purchased_at DESC
                LIMIT 1) AS price
       FROM trip_items ti
       WHERE ti.trip_id = ? AND ti.status != 'dropped'
     )`,
    tripId,
  );
  return { total: row?.total ?? 0, unpriced: row?.unpriced ?? 0 };
}

/**
 * The single entry point for moving a trip forward. Enforces the allowed
 * source status and the acting role, applies side effects, and logs the event.
 *
 * Everything runs as one D1 batch that ends with the status change, and every
 * write is conditional on the trip still being in the status read here. Two
 * people tapping the same button (or a retried request) therefore cannot both
 * post purchases: the second batch finds the status already moved, changes
 * nothing, and gets an error.
 */
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

  let to: TripStatus = rule.to;
  let event: PendingEvent = { action, note: note.trim(), personId: person.id };

  // Approval settings: when the admin turns approval off (or sets an
  // auto-approve ceiling), submit_for_approval short-circuits to approved.
  // The admin's own submissions always skip the pending step — self-approval
  // adds no control, so it should not cost a click.
  if (action === "submit_for_approval") {
    const settings = await getSettings(db);
    const estimate = await tripEstimate(db, tripId);
    const ceiling = Number(settings.auto_approve_under);
    const reason =
      person.role === "admin"
        ? "sent by the admin"
        : settings.require_approval === "0"
          ? "approval not required"
          : ceiling > 0 && estimate.unpriced === 0 && estimate.total < ceiling
            ? `estimate ${estimate.total.toFixed(2)} is under ${ceiling}`
            : null;
    if (reason) {
      to = "approved";
      event = { action: "auto_approved", note: `Auto-approved: ${reason}`, personId: person.id };
    }
  }

  const statements: D1PreparedStatement[] = [];
  const sideEvents: PendingEvent[] = [];

  if (to === "approved") {
    // Freeze the quantity to buy. Without this, a line the store never
    // stepped still reads its requested_qty, which stays editable.
    statements.push(
      d1Stmt(
        db,
        `UPDATE trip_items
         SET approved_qty = COALESCE(approved_qty, requested_qty),
             updated_at = datetime('now')
         WHERE trip_id = ? AND status != 'dropped'
           AND EXISTS (SELECT 1 FROM market_trips WHERE id = ? AND status = ?)`,
        tripId,
        tripId,
        trip.status,
      ),
    );
  }
  if (action === "complete_purchase") {
    statements.push(...purchaseStatements(db, trip));
    sideEvents.push({ action: "purchases_recorded", note: "", personId: person.id });
  }
  if (action === "confirm_receipt") {
    const receipts = await receiptStatements(db, trip);
    statements.push(...receipts.statements);
    sideEvents.push(...receipts.events);
  }

  const sets: string[] = ["status = ?", "updated_at = datetime('now')"];
  const values: unknown[] = [to];
  if (to === "approved") {
    sets.push("approved_by = ?", "approved_at = ?", "rejection_note = ''");
    values.push(person.id, new Date().toISOString());
  }
  if (action === "send_back") {
    sets.push("rejection_note = ?");
    values.push(note.trim());
  }
  statements.push(
    d1Stmt(
      db,
      `UPDATE market_trips SET ${sets.join(", ")} WHERE id = ? AND status = ?`,
      ...values,
      tripId,
      trip.status,
    ),
  );

  const results = await d1Batch(db, statements);
  if (changes(results[results.length - 1]) !== 1) {
    return {
      ok: false,
      error: "Someone else just updated this list. Refresh to see the latest.",
    };
  }

  for (const e of [...sideEvents, event]) {
    await logTripEvent(db, tripId, e.personId, e.action, e.note);
  }
  return { ok: true, status: to };
}

/**
 * Statements that write every bought line into the ledger and bump stock.
 *
 * Set-based, so a trip of any size is six statements: D1 counts every
 * statement in a batch toward its per-request query limit (50 on the Free
 * plan), which a statement-per-line approach blows through on an ordinary
 * list. Each is guarded on the trip still purchasing, so the batch changes
 * nothing if another request already recorded the purchase. The quantity
 * posted is saved to purchased_qty: the delivery check compares against it.
 */
function purchaseStatements(
  db: D1Client,
  trip: MarketTrip,
): D1PreparedStatement[] {
  const open = "EXISTS (SELECT 1 FROM market_trips WHERE id = ? AND status = 'purchasing')";
  const unposted = "trip_id = ? AND status != 'dropped' AND posted = 0";
  const bought = `${unposted} AND purchased_qty > 0`;

  return [
    // Settle the quantity: what the store entered, else what was approved.
    d1Stmt(
      db,
      `UPDATE trip_items
       SET purchased_qty = COALESCE(purchased_qty, approved_qty, requested_qty)
       WHERE ${unposted} AND ${open}`,
      trip.id,
      trip.id,
    ),
    // An extra need that isn't in inventory yet becomes a tracked item. It
    // takes the line's id, which links the two without a lookup.
    d1Stmt(
      db,
      `INSERT INTO inventory_items (id, name, category, unit, current_quantity, min_quantity)
       SELECT id, name, 'Other', unit, 0, 0 FROM trip_items
       WHERE ${bought} AND inventory_item_id IS NULL AND ${open}`,
      trip.id,
      trip.id,
    ),
    d1Stmt(
      db,
      `UPDATE trip_items SET inventory_item_id = id
       WHERE ${bought} AND inventory_item_id IS NULL AND ${open}`,
      trip.id,
      trip.id,
    ),
    d1Stmt(
      db,
      `INSERT INTO purchase_history
         (id, inventory_item_id, market_day_id, quantity, unit_price, notes,
          purchased_at, trip_item_id)
       SELECT lower(hex(randomblob(16))), inventory_item_id, ?, purchased_qty,
              COALESCE(unit_price, 0), ?, ?, id
       FROM trip_items
       WHERE ${bought} AND ${open}`,
      trip.market_day_id ?? null,
      `Trip ${trip.trip_date}`,
      new Date().toISOString(),
      trip.id,
      trip.id,
    ),
    d1Stmt(
      db,
      `UPDATE inventory_items
       SET current_quantity = current_quantity + (
             SELECT SUM(ti.purchased_qty) FROM trip_items ti
             WHERE ti.inventory_item_id = inventory_items.id
               AND ti.trip_id = ? AND ti.status != 'dropped'
               AND ti.posted = 0 AND ti.purchased_qty > 0),
           updated_at = datetime('now')
       WHERE id IN (
               SELECT ti.inventory_item_id FROM trip_items ti
               WHERE ti.trip_id = ? AND ti.status != 'dropped'
                 AND ti.posted = 0 AND ti.purchased_qty > 0)
         AND ${open}`,
      trip.id,
      trip.id,
      trip.id,
    ),
    // Last: flipping `posted` is what the statements above select on.
    d1Stmt(
      db,
      `UPDATE trip_items
       SET status = 'purchased', posted = 1, updated_at = datetime('now')
       WHERE ${bought} AND ${open}`,
      trip.id,
      trip.id,
    ),
  ];
}

/**
 * Statements that apply what actually arrived. Any shortfall is taken back
 * off stock, so the books match the shelf; the shortfalls are returned as
 * trip-log entries. Set-based for the same query-limit reason as above.
 */
async function receiptStatements(
  db: D1Client,
  trip: MarketTrip,
): Promise<{ statements: D1PreparedStatement[]; events: PendingEvent[] }> {
  const open = "EXISTS (SELECT 1 FROM market_trips WHERE id = ? AND status = 'purchased')";
  const bought = "COALESCE(ti.purchased_qty, ti.approved_qty, ti.requested_qty, 0)";
  const short = `MAX(${bought} - COALESCE(ti.received_qty, ${bought}), 0)`;

  const statements = [
    d1Stmt(
      db,
      `UPDATE inventory_items
       SET current_quantity = MAX(0, current_quantity - (
             SELECT SUM(${short}) FROM trip_items ti
             WHERE ti.inventory_item_id = inventory_items.id
               AND ti.trip_id = ? AND ti.status = 'purchased')),
           updated_at = datetime('now')
       WHERE id IN (
               SELECT ti.inventory_item_id FROM trip_items ti
               WHERE ti.trip_id = ? AND ti.status = 'purchased' AND ${short} > 0)
         AND ${open}`,
      trip.id,
      trip.id,
      trip.id,
    ),
    d1Stmt(
      db,
      `UPDATE trip_items
       SET status = 'received',
           received_qty = COALESCE(received_qty, purchased_qty, approved_qty, requested_qty, 0),
           updated_at = datetime('now')
       WHERE trip_id = ? AND status = 'purchased' AND ${open}`,
      trip.id,
      trip.id,
    ),
  ];

  const events: PendingEvent[] = [];
  for (const item of await getTripItems(db, trip.id)) {
    if (item.status !== "purchased") continue;
    const got = item.purchased_qty ?? item.approved_qty ?? item.requested_qty ?? 0;
    const received = item.received_qty ?? got;
    if (got - received > 0 && item.inventory_item_id) {
      events.push({
        action: "short_delivery",
        note: `${item.name}: bought ${got} ${item.unit}, received ${received} ${item.unit}`,
        personId: null,
      });
    }
  }

  return { statements, events };
}
