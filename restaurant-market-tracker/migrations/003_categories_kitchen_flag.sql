-- Migration 003: proper item categories + kitchen tracking flag.
--
-- kitchen_tracked = 0 marks items the kitchen never handles (cleaning,
-- packaging, office...). They still get purchased through trips, but the
-- auto low-stock collector only pulls kitchen-tracked items, so the kitchen
-- is not asked about things that are not theirs.

ALTER TABLE inventory_items ADD COLUMN kitchen_tracked INTEGER NOT NULL DEFAULT 1;

-- ── Recategorize by what the item actually is (was: supplier name) ──

-- Meat & poultry
UPDATE inventory_items SET category='Meat' WHERE name IN (
  'Lamb','Rabbit','Deer','Pork Roll','Chicken','Thigh Fillets','Lamb chops',
  'Goat Curry','Goat Small Cut','Sheek Kebab');

-- Seafood
UPDATE inventory_items SET category='Seafood' WHERE name IN (
  'Pomfret','Clams','Prawns','Crab','snapper','red spot','Munveh');

-- Eggs & dairy
UPDATE inventory_items SET category='Dairy & Eggs' WHERE name IN (
  'Duck egg','Quail Egg','Hen Egg','Milk','Butter','Cheese','Pepperjack',
  'Thickened Cream','Kara Cream','Ghee 10l','Icecream');

-- Produce (the VEGE list + fruit)
UPDATE inventory_items SET category='Produce' WHERE name IN (
  'Onion 20kg','Potato 5kg','Carrot 25kg','Spanish Onion 10kg','Tomato',
  'Chilli Small','Chilli Big','Cucumber','Capsicum','Egg Plant','Cauliflower',
  'Coriander','Mint','Leeks','Celery','Spring Onion','Ginger',
  'Garlic Peeled Box','Cabbage','Lime','Orange','Strawberry','Watermelon',
  'Rockmelon','Grapes','Dates','Cut beans','Spinach','Curry Leaves',
  'Banana Leaf','Frozen Pea');

-- Pantry / dry goods
UPDATE inventory_items SET category='Pantry' WHERE name IN (
  'Sugar','Plain Flour','Sunflower oil','Coconut Oil','Rice Tiger 20kg',
  'Sultana','Baking powder','Almond pieces','Cashew nuts','Bread Crumbs',
  'Falooda Mix','Jelly','Garlic Granules');

-- Sauces & condiments
UPDATE inventory_items SET category='Sauces' WHERE name IN (
  'Tomato Sauce','Chilli Sauce','Tomato paste','Tomato puree',
  'Red tandoori colour','Kashmiri Chilli','Round Mint Sauce');

-- Drinks
UPDATE inventory_items SET category='Drinks' WHERE name IN (
  'Coke','Coke NO sugar','Fanta','Sprite','Soda','Nu water');

-- Cleaning & hygiene
UPDATE inventory_items SET category='Cleaning' WHERE name IN (
  'Bleach','Dishwashing Liquid','Handwash Liquid','Cloth wash','Wiper','Mop',
  'Blue Cloth','Gas Refill','Gloves','Toilet Roll');

-- Packaging & disposables
UPDATE inventory_items SET category='Packaging' WHERE name IN (
  'Kitchen Bin bag','Front Bin Bag','White Napkin','Tork','Aluminum Foil',
  'Duck box','Zip lock bag','jar 3l','jar 500ml','VP17','VP4','VP500-Lid',
  'VP650-Lid','VP1000-Lid','Yellow napkin','Cling Wrap','Naan Bag large',
  'Naan Bag small','Carry bag large','Carry bag small','Round Raita',
  'Butter paper','Tooth pick','Docket Book','eft roll','kot roll',
  'Fuel Chef''n Dish');

-- Office
UPDATE inventory_items SET category='Office' WHERE name IN (
  'Printer ink','Stapler pin','Change for Till');

-- Everything left stays Misc (Ultra White, Lollies, Lighter, Any Alcohol,
-- Table Sheet...).

-- ── Kitchen tracking: store-managed items never bother the kitchen ──

UPDATE inventory_items SET kitchen_tracked = 0 WHERE category IN (
  'Cleaning','Packaging','Office','Drinks');

-- Store-side consumables that live in food categories but aren't kitchen stock
UPDATE inventory_items SET kitchen_tracked = 0 WHERE name IN (
  'Lollies','Lighter','Table Sheet','Any Alcohol','Ultra White','Tork');
