-- Migration 006: match stores and the Wednesday schedule to the purchase list
-- sheet (Purchase_List_Updates.xlsx).
--
-- The first import stopped partway through the sheet's Wednesday section, so
-- only 7 of its 17 stores had anything scheduled and the Wednesday trip only
-- ever listed those. It also read the HAFDA header as part of CASULA FISH and
-- skipped VP17/VP4. Everything here is keyed by item name and safe to re-run.

-- ── Items the import skipped (GUDDU packaging, like the VP lids) ──

INSERT INTO inventory_items
  (name, category, unit, current_quantity, min_quantity, kitchen_tracked, store)
SELECT 'VP17', 'Packaging', 'unit', 10, 5, 0, 'GUDDU'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'VP17');

INSERT INTO inventory_items
  (name, category, unit, current_quantity, min_quantity, kitchen_tracked, store)
SELECT 'VP4', 'Packaging', 'unit', 10, 5, 0, 'GUDDU'
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'VP4');

-- ── Stores ──

-- HAFDA is its own shop, not part of CASULA FISH.
UPDATE inventory_items SET store = 'HAFDA'
WHERE name IN ('Goat Curry', 'Goat Small Cut', 'Sheek Kebab');

UPDATE inventory_items SET store = 'OTHERS'
WHERE name IN ('Cloth wash', 'Gas Refill', 'Any Alcohol', 'Printer ink',
               'Change for Till', 'Curry Leaves');

-- The Sunday market run has no particular store. Migration 005's backfill had
-- filed these under OTHERS.
UPDATE inventory_items SET store = NULL
WHERE name IN ('Lamb', 'Duck egg', 'Quail Egg', 'Hen Egg', 'Pomfret', 'Clams',
               'Prawns', 'Rabbit', 'Deer', 'Ultra White', 'Kara Cream');

-- ── Wednesday schedule: the rest of the sheet ──
-- OR IGNORE keeps any quantity already set, and does not re-activate a line
-- someone switched off.

INSERT OR IGNORE INTO market_items (market_day_id, inventory_item_id, default_quantity)
SELECT md.id, ii.id, 5
FROM inventory_items ii
JOIN market_days md ON md.day_of_week = 3
WHERE ii.name IN (
  -- VEGE (fruit)
  'Lime', 'Orange', 'Strawberry', 'Watermelon', 'Rockmelon', 'Grapes', 'Dates',
  -- GUDDU
  'Table Sheet', 'Yellow napkin', 'VP17', 'VP4', 'VP500-Lid', 'VP650-Lid',
  'VP1000-Lid', 'Ghee 10l', 'Rice Tiger 20kg', 'Thickened Cream',
  'Garlic Granules', 'Baking powder', 'Almond pieces', 'Red tandoori colour',
  'Tomato paste', 'Tomato puree', 'Cashew nuts',
  -- NILGIRIS
  'Falooda Mix',
  -- WOOLWORTH
  'Icecream', 'Sultana', 'Jelly', 'Tooth pick', 'Bread Crumbs',
  -- LINDAS
  'Toilet Roll', 'Cling Wrap', 'Naan Bag large', 'Naan Bag small',
  'Carry bag large', 'Carry bag small', 'Fuel Chef''n Dish', 'Round Raita',
  'Round Mint Sauce', 'Docket Book', 'Butter paper', 'eft roll', 'kot roll',
  'Gloves',
  -- COLES
  'Lamb chops',
  -- CABRAMATTA
  'Banana Leaf',
  -- OTHERS
  'Cloth wash', 'Gas Refill', 'Any Alcohol', 'Printer ink', 'Change for Till',
  'Curry Leaves',
  -- BUNNINGS
  'Wiper', 'Mop',
  -- OFFICEWORKS
  'Stapler pin'
);
