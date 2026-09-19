-- Migration 007: keep history intact and make concurrent use safe.

-- Deleting a stock item archives it instead. purchase_history cascades on a
-- real DELETE, which silently wiped the item's spend from every report.
ALTER TABLE inventory_items ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

-- Which trip line a ledger row came from, so deleting a purchase can take its
-- stock back off. Rows recorded outside a trip never touched stock and stay NULL.
ALTER TABLE purchase_history ADD COLUMN trip_item_id TEXT
  REFERENCES trip_items(id) ON DELETE SET NULL;

UPDATE purchase_history
SET trip_item_id = (
  SELECT ti.id
  FROM trip_items ti
  JOIN market_trips t ON t.id = ti.trip_id
  WHERE ti.inventory_item_id = purchase_history.inventory_item_id
    AND ti.posted = 1
    AND purchase_history.notes = 'Trip ' || t.trip_date
  LIMIT 1
)
WHERE trip_item_id IS NULL AND notes LIKE 'Trip %';

-- One list per market date: two devices opening the app at the same moment
-- could otherwise each create a trip for the next market day.
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_date_unique ON market_trips (trip_date);
