-- Migration 005: which shop/route each item is bought from.
--
-- The Wednesday run visits many stores in different directions (COSTCO, ALDI,
-- VEGE, CASULA FISH...), so the shopping list groups by store as well as
-- category. NULL means "no particular store" (e.g. the Sunday market run or
-- the catch-all OTHERS).

ALTER TABLE inventory_items ADD COLUMN store TEXT;
ALTER TABLE trip_items ADD COLUMN store TEXT;

UPDATE inventory_items SET store = 'OTHERS' WHERE store IS NULL;
