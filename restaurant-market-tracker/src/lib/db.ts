// D1 database helper for Cloudflare Workers.
// Access the D1 binding from Cloudflare context via getCloudflareContext.

import type {
  InventoryItem,
  MarketDay,
  MarketItem,
  PurchaseRecord,
  ChecklistItem,
} from "./types";

// When running on Cloudflare Workers, the D1 binding is available
// via the cloudflare:workers runtime. For local dev with wrangler,
// it's injected automatically.

// We use a thin wrapper so all DB access goes through one place.

export interface D1Client {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<{ success: boolean }>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean; meta?: { last_row_id?: string } }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1Env {
  DB: D1Client;
}

/**
 * Generate a primary key for a new row.
 *
 * D1's `meta.last_row_id` is SQLite's internal rowid, not our TEXT primary
 * key, so ids are generated here and written explicitly.
 */
function newId(): string {
  return crypto.randomUUID();
}

/**
 * Helper: run a query and return all results.
 */
export async function d1All<T>(
  db: D1Client,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const stmt = db.prepare(sql).bind(...params);
  const { results } = await stmt.all<T>();
  return results;
}

/**
 * Helper: run a query and return first result.
 */
export async function d1First<T>(
  db: D1Client,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const stmt = db.prepare(sql).bind(...params);
  return stmt.first<T>();
}

/**
 * Helper: run a non-SELECT statement.
 */
export async function d1Run(
  db: D1Client,
  sql: string,
  ...params: unknown[]
): Promise<{ success: boolean }> {
  const stmt = db.prepare(sql).bind(...params);
  return stmt.run();
}

// ─── Inventory Queries ──────────────────────────────────────

export async function getAllInventory(db: D1Client): Promise<InventoryItem[]> {
  return d1All<InventoryItem>(
    db,
    "SELECT * FROM inventory_items ORDER BY category, name"
  );
}

export async function getInventoryItem(
  db: D1Client,
  id: string
): Promise<InventoryItem | null> {
  return d1First<InventoryItem>(
    db,
    "SELECT * FROM inventory_items WHERE id = ?",
    id
  );
}

export async function createInventoryItem(
  db: D1Client,
  item: Omit<InventoryItem, "id" | "created_at" | "updated_at">
): Promise<string> {
  const id = newId();
  await d1Run(
    db,
    `INSERT INTO inventory_items (id, name, category, unit, current_quantity, min_quantity, kitchen_tracked)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    item.name,
    item.category,
    item.unit,
    item.current_quantity,
    item.min_quantity,
    item.kitchen_tracked ?? 1
  );
  return id;
}

export async function updateInventoryItem(
  db: D1Client,
  id: string,
  item: Partial<Omit<InventoryItem, "id" | "created_at" | "updated_at">>
): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(item)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const result = await d1Run(
    db,
    `UPDATE inventory_items SET ${fields.join(", ")} WHERE id = ?`,
    ...values
  );
  return result.success;
}

export async function deleteInventoryItem(
  db: D1Client,
  id: string
): Promise<boolean> {
  const result = await d1Run(
    db,
    "DELETE FROM inventory_items WHERE id = ?",
    id
  );
  return result.success;
}

export async function adjustInventoryQuantity(
  db: D1Client,
  id: string,
  delta: number
): Promise<boolean> {
  const result = await d1Run(
    db,
    `UPDATE inventory_items 
     SET current_quantity = MAX(0, current_quantity + ?) 
     WHERE id = ?`,
    delta,
    id
  );
  return result.success;
}

export async function getLowStockItems(
  db: D1Client
): Promise<InventoryItem[]> {
  return d1All<InventoryItem>(
    db,
    `SELECT * FROM inventory_items 
     WHERE min_quantity > 0 AND current_quantity <= min_quantity 
     ORDER BY category, name`
  );
}

// ─── Market Day Queries ─────────────────────────────────────

export async function getAllMarketDays(db: D1Client): Promise<MarketDay[]> {
  return d1All<MarketDay>(
    db,
    "SELECT * FROM market_days ORDER BY day_of_week"
  );
}

export async function getMarketDayByDow(
  db: D1Client,
  dayOfWeek: number
): Promise<MarketDay | null> {
  return d1First<MarketDay>(
    db,
    "SELECT * FROM market_days WHERE day_of_week = ?",
    dayOfWeek
  );
}

export async function createMarketDay(
  db: D1Client,
  dayOfWeek: number
): Promise<string> {
  const id = newId();
  await d1Run(
    db,
    "INSERT INTO market_days (id, day_of_week) VALUES (?, ?)",
    id,
    dayOfWeek
  );
  return id;
}

export async function deleteMarketDay(
  db: D1Client,
  id: string
): Promise<boolean> {
  const result = await d1Run(db, "DELETE FROM market_days WHERE id = ?", id);
  return result.success;
}

// ─── Market Item Queries ────────────────────────────────────

export async function getMarketItemsByDay(
  db: D1Client,
  marketDayId: string
): Promise<MarketItem[]> {
  return d1All<MarketItem>(
    db,
    `SELECT mi.*, ii.name as item_name, ii.unit as item_unit, 
            ii.category as item_category, ii.current_quantity, ii.min_quantity
     FROM market_items mi
     JOIN inventory_items ii ON mi.inventory_item_id = ii.id
     WHERE mi.market_day_id = ? AND mi.is_active = 1
     ORDER BY ii.category, ii.name`,
    marketDayId
  );
}

export async function addMarketItem(
  db: D1Client,
  marketDayId: string,
  inventoryItemId: string,
  defaultQuantity: number
): Promise<string> {
  const id = newId();
  await d1Run(
    db,
    `INSERT OR REPLACE INTO market_items 
     (id, market_day_id, inventory_item_id, default_quantity, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    id,
    marketDayId,
    inventoryItemId,
    defaultQuantity
  );
  return id;
}

export async function updateMarketItem(
  db: D1Client,
  id: string,
  defaultQuantity: number
): Promise<boolean> {
  const result = await d1Run(
    db,
    "UPDATE market_items SET default_quantity = ? WHERE id = ?",
    defaultQuantity,
    id
  );
  return result.success;
}

export async function removeMarketItem(
  db: D1Client,
  id: string
): Promise<boolean> {
  const result = await d1Run(
    db,
    "DELETE FROM market_items WHERE id = ?",
    id
  );
  return result.success;
}

// ─── Purchase Queries ───────────────────────────────────────

export async function getAllPurchases(
  db: D1Client,
  limit = 100,
  offset = 0
): Promise<PurchaseRecord[]> {
  return d1All<PurchaseRecord>(
    db,
    `SELECT p.*, ii.name as item_name, ii.unit as item_unit,
            md.day_of_week as day_name
     FROM purchase_history p
     JOIN inventory_items ii ON p.inventory_item_id = ii.id
     LEFT JOIN market_days md ON p.market_day_id = md.id
     ORDER BY p.purchased_at DESC
     LIMIT ? OFFSET ?`,
    limit,
    offset
  );
}

export async function getPurchasesByDateRange(
  db: D1Client,
  from: string,
  to: string
): Promise<PurchaseRecord[]> {
  return d1All<PurchaseRecord>(
    db,
    `SELECT p.*, ii.name as item_name, ii.unit as item_unit,
            md.day_of_week as day_name
     FROM purchase_history p
     JOIN inventory_items ii ON p.inventory_item_id = ii.id
     LEFT JOIN market_days md ON p.market_day_id = md.id
     WHERE p.purchased_at >= ? AND p.purchased_at <= ?
     ORDER BY p.purchased_at DESC`,
    from,
    to
  );
}

export async function recordPurchase(
  db: D1Client,
  purchase: {
    inventory_item_id: string;
    market_day_id?: string | null;
    quantity: number;
    unit_price: number;
    notes?: string;
    purchased_at?: string;
  }
): Promise<string> {
  const id = newId();
  await d1Run(
    db,
    `INSERT INTO purchase_history 
     (id, inventory_item_id, market_day_id, quantity, unit_price, notes, purchased_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    purchase.inventory_item_id,
    purchase.market_day_id || null,
    purchase.quantity,
    purchase.unit_price,
    purchase.notes || "",
    purchase.purchased_at || new Date().toISOString()
  );
  return id;
}

export async function deletePurchase(
  db: D1Client,
  id: string
): Promise<boolean> {
  const result = await d1Run(
    db,
    "DELETE FROM purchase_history WHERE id = ?",
    id
  );
  return result.success;
}

export async function getSpendSummary(
  db: D1Client,
  from: string,
  to: string
): Promise<{ item_name: string; total: number; count: number }[]> {
  return d1All<{ item_name: string; total: number; count: number }>(
    db,
    `SELECT ii.name as item_name, SUM(p.total_cost) as total, COUNT(*) as count
     FROM purchase_history p
     JOIN inventory_items ii ON p.inventory_item_id = ii.id
     WHERE p.purchased_at >= ? AND p.purchased_at <= ?
     GROUP BY ii.name
     ORDER BY total DESC`,
    from,
    to
  );
}

// ─── Checklist Queries ──────────────────────────────────────

export async function getTodayChecklist(
  db: D1Client,
  dayOfWeek: number
): Promise<ChecklistItem[]> {
  // Get items assigned to today's market day + low stock items
  const scheduled = await d1All<ChecklistItem>(
    db,
    `SELECT ii.id as inventory_item_id, ii.name, ii.category, ii.unit,
            ii.current_quantity, ii.min_quantity, mi.default_quantity,
            'schedule' as source
     FROM market_items mi
     JOIN inventory_items ii ON mi.inventory_item_id = ii.id
     WHERE mi.market_day_id IN (SELECT id FROM market_days WHERE day_of_week = ?)
       AND mi.is_active = 1`,
    dayOfWeek
  );

  const lowStock = await d1All<ChecklistItem>(
    db,
    `SELECT ii.id as inventory_item_id, ii.name, ii.category, ii.unit,
            ii.current_quantity, ii.min_quantity, NULL as default_quantity,
            'low_stock' as source
     FROM inventory_items ii
     WHERE ii.min_quantity > 0 AND ii.current_quantity <= ii.min_quantity`
  );

  // Merge: scheduled items first, then add low-stock items not already in the list
  const seen = new Set(scheduled.map((i) => i.inventory_item_id));
  const merged = [...scheduled];
  for (const item of lowStock) {
    if (!seen.has(item.inventory_item_id)) {
      merged.push(item);
    }
  }
  return merged;
}

// ─── Stats Queries ──────────────────────────────────────────

/** Weekly spend totals, oldest first, for the trend chart. Buckets use the
 * company timezone and configured week-start day. `weekStartDow` follows
 * SQLite's `weekday N` modifier: 0 = Sunday … 6 = Saturday, where N is the
 * week-start day itself. */
export async function getSpendTrend(
  db: D1Client,
  weeks: number,
  tzOffsetHours = 10, // Australia/Sydney (AEST) fallback
  weekStartDow = 1
): Promise<{ week_start: string; total: number }[]> {
  return d1All<{ week_start: string; total: number }>(
    db,
    `WITH local AS (
       SELECT datetime(purchased_at, ?) AS at, total_cost
       FROM purchase_history
     )
     SELECT date(at, ?) as week_start,
            SUM(total_cost) as total
     FROM local
     WHERE at >= datetime('now', ?)
     GROUP BY week_start
     ORDER BY week_start`,
    `${tzOffsetHours >= 0 ? "+" : ""}${tzOffsetHours} hours`,
    `weekday ${weekStartDow}`,
    `-${weeks * 7} days`,
  );
}

/** Spend by category over a range, for the breakdown chart. */
export async function getSpendByCategory(
  db: D1Client,
  from: string,
  to: string
): Promise<{ category: string; total: number }[]> {
  return d1All<{ category: string; total: number }>(
    db,
    `SELECT ii.category, COALESCE(SUM(p.total_cost), 0) as total
     FROM purchase_history p
     JOIN inventory_items ii ON p.inventory_item_id = ii.id
     WHERE p.purchased_at >= ? AND p.purchased_at <= ?
     GROUP BY ii.category
     ORDER BY total DESC`,
    from,
    to,
  );
}

/** This week vs last week, for the admin home delta card. Honours the
 * company timezone and week-start day. */
export async function getWeekOverWeekSpend(
  db: D1Client,
  tzOffsetHours = 10,
  weekStartDow = 1
): Promise<{ this_week: number; last_week: number }> {
  const result = await d1First<{ this_week: number; last_week: number }>(
    db,
    `WITH local AS (
       SELECT datetime(purchased_at, ?) AS at, total_cost
       FROM purchase_history
     ),
     bounds AS (
       SELECT date(at, ?) AS ws FROM local ORDER BY at DESC LIMIT 1
     )
     SELECT
       COALESCE(SUM(CASE WHEN at >= (SELECT ws FROM bounds) THEN total_cost END), 0) as this_week,
       COALESCE(SUM(CASE WHEN at >= date((SELECT ws FROM bounds), '-7 days')
                          AND at < (SELECT ws FROM bounds) THEN total_cost END), 0) as last_week
     FROM local`,
    `${tzOffsetHours >= 0 ? "+" : ""}${tzOffsetHours} hours`,
    `weekday ${weekStartDow}`,
  );
  return result ?? { this_week: 0, last_week: 0 };
}

export async function getWeeklySpend(db: D1Client): Promise<number> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const result = await d1First<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(total_cost), 0) as total 
     FROM purchase_history 
     WHERE purchased_at >= ?`,
    startOfWeek.toISOString()
  );
  return result?.total ?? 0;
}

export async function getTotalInventoryItems(db: D1Client): Promise<number> {
  const result = await d1First<{ count: number }>(
    db,
    "SELECT COUNT(*) as count FROM inventory_items"
  );
  return result?.count ?? 0;
}

export async function getNextMarketDay(
  db: D1Client
): Promise<MarketDay | null> {
  const today = new Date().getDay();
  // Try today first, then loop through the rest of the week
  for (let i = 0; i < 7; i++) {
    const dow = (today + i) % 7;
    const day = await getMarketDayByDow(db, dow);
    if (day) return day;
  }
  return null;
}
