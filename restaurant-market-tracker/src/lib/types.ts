// Types for the restaurant market tracker database.
// These mirror the D1 schema and are used across client and server code.

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_quantity: number;
  min_quantity: number;
  /** Store-managed items (cleaning, packaging...) never bother the kitchen. */
  kitchen_tracked: 0 | 1;
  /** Which shop/route this is bought from (COSTCO, ALDI, VEGE...). */
  store: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketDay {
  id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
  created_at: string;
}

export interface MarketItem {
  id: string;
  market_day_id: string;
  inventory_item_id: string;
  default_quantity: number;
  is_active: number; // SQLite boolean: 0 or 1
  // Joined fields
  item_name?: string;
  item_unit?: string;
  item_category?: string;
  current_quantity?: number;
  min_quantity?: number;
}

export interface PurchaseRecord {
  id: string;
  inventory_item_id: string;
  market_day_id: string | null;
  quantity: number;
  unit_price: number;
  total_cost: number;
  notes: string;
  purchased_at: string;
  created_at: string;
  // Joined fields
  item_name?: string;
  item_unit?: string;
  day_name?: string;
}

export interface ChecklistItem {
  inventory_item_id: string;
  name: string;
  category: string;
  unit: string;
  current_quantity: number;
  min_quantity: number;
  default_quantity: number | null;
  source: "schedule" | "low_stock";
}

export type DayName =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

/** Display order for category sections across the app. */
export const CATEGORY_ORDER = [
  "Produce",
  "Meat",
  "Seafood",
  "Dairy & Eggs",
  "Pantry",
  "Sauces",
  "Drinks",
  "Packaging",
  "Cleaning",
  "Office",
  "Misc",
];

export const DAY_NAMES: DayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const CATEGORIES = [
  "Produce",
  "Meat",
  "Seafood",
  "Dairy & Eggs",
  "Pantry",
  "Sauces",
  "Drinks",
  "Cleaning",
  "Packaging",
  "Office",
  "Misc",
] as const;

/** Categories the kitchen never handles — these skip kitchen low-stock checks. */
export const STORE_ONLY_CATEGORIES = new Set([
  "Cleaning",
  "Packaging",
  "Office",
  "Drinks",
]);

// ─── Personas ───────────────────────────────────────────────

export type Role = "kitchen" | "store" | "admin";

export const ROLE_LABELS: Record<Role, string> = {
  kitchen: "Kitchen",
  store: "Store manager",
  admin: "Admin",
};

export interface Person {
  id: string;
  name: string;
  role: Role;
  /** Salted hash — server-side only, never sent to the browser. */
  pin_hash: string;
  active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** A person with no secrets, safe to pass into client components. */
export type SafePerson = Omit<Person, "pin_hash">;

/** Strips the PIN hash before a person crosses into client code. */
export function toSafePerson(person: Person): SafePerson {
  const { id, name, role, active, sort_order, created_at, updated_at } = person;
  return { id, name, role, active, sort_order, created_at, updated_at };
}

// ─── Market trips ───────────────────────────────────────────

export type TripStatus =
  | "collecting"
  | "reviewing"
  | "pending_approval"
  | "approved"
  | "purchasing"
  | "purchased"
  | "received";

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  collecting: "Collecting requests",
  reviewing: "Being verified",
  pending_approval: "Waiting for approval",
  approved: "Approved — ready to buy",
  purchasing: "Buying now",
  purchased: "Bought — awaiting delivery",
  received: "Delivered and received",
};

export type TripItemSource =
  | "kitchen_ran_out"
  | "kitchen_extra"
  | "store_added"
  | "auto_low_stock"
  | "auto_schedule";

export const SOURCE_LABELS: Record<TripItemSource, string> = {
  kitchen_ran_out: "Ran out",
  kitchen_extra: "Extra need",
  store_added: "Added by store",
  auto_low_stock: "Low stock",
  auto_schedule: "Scheduled",
};

export type TripItemStatus =
  | "pending"
  | "approved"
  | "dropped"
  | "purchased"
  | "received";

export interface TripItem {
  id: string;
  trip_id: string;
  inventory_item_id: string | null;
  name: string;
  unit: string;
  source: TripItemSource;
  status: TripItemStatus;
  requested_qty: number;
  approved_qty: number | null;
  purchased_qty: number | null;
  received_qty: number | null;
  unit_price: number | null;
  posted: number;
  requested_by: string | null;
  requested_by_name?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined from inventory_items when the line maps to a tracked item.
  current_quantity?: number | null;
  min_quantity?: number | null;
  category?: string | null;
  /** Which shop/route to buy this from (COSTCO, ALDI, VEGE...). */
  store?: string | null;
}

/** The quantity that actually matters at the trip's current stage. */
export function effectiveQty(item: TripItem): number {
  return (
    item.purchased_qty ??
    item.approved_qty ??
    item.requested_qty ??
    0
  );
}

/** Shortfall between what was bought and what turned up. */
export function shortfall(item: TripItem): number {
  if (item.received_qty == null || item.purchased_qty == null) return 0;
  return Math.max(0, item.purchased_qty - item.received_qty);
}

export interface MarketTrip {
  id: string;
  market_day_id: string | null;
  trip_date: string;
  status: TripStatus;
  created_by: string | null;
  approved_by: string | null;
  approved_by_name?: string | null;
  approved_at: string | null;
  rejection_note: string;
  created_at: string;
  updated_at: string;
  items?: TripItem[];
  events?: TripEvent[];
  item_count?: number;
}

export interface TripEvent {
  id: string;
  trip_id: string;
  person_id: string | null;
  person_name?: string | null;
  action: string;
  note: string;
  created_at: string;
}

export type TripAction =
  | "start_review"
  | "submit_for_approval"
  | "approve"
  | "send_back"
  | "start_purchasing"
  | "complete_purchase"
  | "confirm_receipt";

interface Transition {
  label: string;
  from: TripStatus[];
  to: TripStatus;
  roles: Role[];
  /** Shown as the primary action for this status. */
  primary?: boolean;
}

/**
 * The whole workflow in one place. Every status change goes through here,
 * and the API enforces `from` and `roles` before applying `to`.
 */
export const TRANSITIONS: Record<TripAction, Transition> = {
  start_review: {
    label: "Start verifying",
    from: ["collecting"],
    to: "reviewing",
    roles: ["store", "admin"],
    primary: true,
  },
  submit_for_approval: {
    label: "Send for approval",
    from: ["reviewing"],
    to: "pending_approval",
    roles: ["store", "admin"],
    primary: true,
  },
  approve: {
    label: "Approve list",
    from: ["pending_approval"],
    to: "approved",
    roles: ["admin"],
    primary: true,
  },
  send_back: {
    label: "Send back to store",
    from: ["pending_approval"],
    to: "reviewing",
    roles: ["admin"],
  },
  start_purchasing: {
    label: "Start buying",
    from: ["approved"],
    to: "purchasing",
    roles: ["store", "admin"],
    primary: true,
  },
  complete_purchase: {
    label: "Finish and record",
    from: ["purchasing"],
    to: "purchased",
    roles: ["store", "admin"],
    primary: true,
  },
  confirm_receipt: {
    label: "Confirm delivery",
    from: ["purchased"],
    to: "received",
    roles: ["kitchen", "admin"],
    primary: true,
  },
};

/** Actions this role may run on a trip in its current status. */
export function availableActions(
  role: Role,
  status: TripStatus,
): TripAction[] {
  return (Object.keys(TRANSITIONS) as TripAction[]).filter(
    (action) =>
      TRANSITIONS[action].roles.includes(role) &&
      TRANSITIONS[action].from.includes(status),
  );
}

/** Where a trip is in the workflow, 0-based, for progress display. */
export const TRIP_STEPS: TripStatus[] = [
  "collecting",
  "reviewing",
  "pending_approval",
  "approved",
  "purchasing",
  "purchased",
  "received",
];

export function tripStep(status: TripStatus): number {
  return TRIP_STEPS.indexOf(status);
}
