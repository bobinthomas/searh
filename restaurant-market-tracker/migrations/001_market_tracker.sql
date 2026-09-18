-- D1 database migration for the Restaurant Market Tracker.
-- Apply locally:  npm run db:init
-- Apply to remote: npm run db:init:remote

-- Inventory items (master list of ingredients)
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  unit TEXT NOT NULL,
  current_quantity REAL NOT NULL DEFAULT 0,
  min_quantity REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Market days (weekly schedule)
CREATE TABLE IF NOT EXISTS market_days (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  day_of_week INTEGER NOT NULL UNIQUE, -- 0=Sun, 1=Mon, ..., 6=Sat
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Market items (items assigned to a market day)
CREATE TABLE IF NOT EXISTS market_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  market_day_id TEXT NOT NULL REFERENCES market_days(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  default_quantity REAL NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(market_day_id, inventory_item_id)
);

-- Purchase history
CREATE TABLE IF NOT EXISTS purchase_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  market_day_id TEXT REFERENCES market_days(id) ON DELETE SET NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  total_cost REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT DEFAULT '',
  purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_items_day ON market_items(market_day_id);
CREATE INDEX IF NOT EXISTS idx_market_items_item ON market_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchase_history(inventory_item_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchase_history(purchased_at DESC);
