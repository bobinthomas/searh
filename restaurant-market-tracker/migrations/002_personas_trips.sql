-- Personas, sessions and the market-trip workflow.
--
-- Roles:
--   kitchen  reports ran-outs and extra needs, confirms deliveries
--   store    verifies the list, adds items, buys, records actuals
--   admin    approves or sends the list back, manages people
--
-- Apply locally:     npm run db:init
-- Apply to remote:   npm run db:init:remote

-- ── People (staff who sign in) ──────────────────────────────
CREATE TABLE IF NOT EXISTS people (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('kitchen', 'store', 'admin')),
  pin_hash    TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_people_active ON people (active, sort_order);

-- ── Sessions (cookie -> person) ─────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_person ON sessions (person_id);

-- ── Login throttling ────────────────────────────────────────
-- A 4-digit PIN only has 10,000 combinations, so repeated failures lock
-- the person out for a while.
CREATE TABLE IF NOT EXISTS login_attempts (
  person_id     TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  failed        INTEGER NOT NULL DEFAULT 0,
  locked_until  TEXT
);

-- ── Market trips (one list per trip to market) ──────────────
CREATE TABLE IF NOT EXISTS market_trips (
  id             TEXT PRIMARY KEY,
  market_day_id  TEXT REFERENCES market_days(id) ON DELETE SET NULL,
  trip_date      TEXT NOT NULL,               -- YYYY-MM-DD
  status         TEXT NOT NULL DEFAULT 'collecting'
                 CHECK (status IN (
                   'collecting', 'reviewing', 'pending_approval',
                   'approved', 'purchasing', 'purchased', 'received'
                 )),
  created_by     TEXT REFERENCES people(id) ON DELETE SET NULL,
  approved_by    TEXT REFERENCES people(id) ON DELETE SET NULL,
  approved_at    TEXT,
  rejection_note TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trips_date ON market_trips (trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status ON market_trips (status);

-- ── Trip items (one line on the list) ───────────────────────
-- source records where a line came from, so the UI can show why it is there:
--   kitchen_ran_out  kitchen tapped an existing inventory item
--   kitchen_extra    kitchen typed something not in inventory
--   store_added      store manager added or missed something
--   auto_low_stock   generated because stock is at/below the reorder level
--   auto_schedule    generated from the day's market schedule
CREATE TABLE IF NOT EXISTS trip_items (
  id                TEXT PRIMARY KEY,
  trip_id           TEXT NOT NULL REFERENCES market_trips(id) ON DELETE CASCADE,
  inventory_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  unit              TEXT NOT NULL DEFAULT '',
  source            TEXT NOT NULL CHECK (source IN (
                      'kitchen_ran_out', 'kitchen_extra', 'store_added',
                      'auto_low_stock', 'auto_schedule'
                    )),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'dropped', 'purchased', 'received')),
  requested_qty     REAL NOT NULL DEFAULT 0,
  approved_qty      REAL,
  purchased_qty     REAL,
  received_qty      REAL,
  unit_price        REAL,
  posted            INTEGER NOT NULL DEFAULT 0,  -- ledger already written for this line
  requested_by      TEXT REFERENCES people(id) ON DELETE SET NULL,
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trip_items_trip ON trip_items (trip_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trip_items_inventory ON trip_items (inventory_item_id);
-- A given inventory item can only appear once per trip, whatever its source.
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_items_unique_inventory
  ON trip_items (trip_id, inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;

-- ── Trip events (audit trail) ───────────────────────────────
CREATE TABLE IF NOT EXISTS trip_events (
  id          TEXT PRIMARY KEY,
  trip_id     TEXT NOT NULL REFERENCES market_trips(id) ON DELETE CASCADE,
  person_id   TEXT REFERENCES people(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trip_events_trip ON trip_events (trip_id, created_at);

-- ── Seed staff ──────────────────────────────────────────────
-- Change these PINs straight away from More → Account, or add your own
-- people from More → People and deactivate these.
--   Admin          1234
--   Store Manager  2345
--   Kitchen        3456
INSERT OR IGNORE INTO people (id, name, role, pin_hash, sort_order) VALUES
  ('person-admin',   'Admin',         'admin',
   'mtmtha01:aa90fec4ab5766c9c67d6c1b7787cce301d84861ee08b24f9df66bf8bd153f69', 0),
  ('person-store',   'Store Manager', 'store',
   'mtsrbz02:09156b5085b5f63545cd34edc2208d33fd4d53a25a1944658f7375e9c79a7681', 1),
  ('person-kitchen', 'Kitchen',       'kitchen',
   'mtkchn03:6346e83d809ca15c0970b4c04969503283fd7d9bdb370d0a1776e510791d607e', 2);
