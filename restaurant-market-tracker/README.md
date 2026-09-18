# 🍽️ Restaurant Market Tracker

Stock, market lists and purchases for a restaurant, split across **three roles**:

| Role | What they do |
| --- | --- |
| **Kitchen** | Report what has run out, ask for extras, confirm what actually arrives |
| **Store manager** | Keep stock and market days up to date, verify the kitchen's list, buy it, record what was paid |
| **Admin** | Approve the list or send it back with a comment, manage staff |

Runs on **Cloudflare Workers** with **D1** (SQLite). Mobile-first: tap targets are
sized for one-handed use and navigation is a bottom tab bar.

## How a list moves

```
collecting → reviewing → pending_approval → approved → purchasing → purchased → received
                  ↑              │
                  └── sent back ─┘
```

1. **collecting** — the kitchen reports ran-outs and extras. Items at or below their
   reorder level and the day's scheduled items are added automatically. Requests
   raised on a non-market day **queue into the next trip**, so nothing is lost.
2. **reviewing** — the store manager checks the list, adds anything missing or any
   consumable, drops what isn't needed, and sets the quantities to buy.
3. **pending_approval** — the admin can change quantities, drop lines and add a note,
   then **Approve** or **Send back** with a comment (which returns it to `reviewing`).
4. **approved** — the list locks and goes back to the store manager.
5. **purchasing** — the store manager enters what was actually bought and the price.
6. **purchased** — stock is updated and the purchase is written to the ledger;
   anything that wasn't in stock yet becomes a tracked item.
7. **received** — the kitchen confirms what turned up. Short deliveries are taken
   back off stock and recorded.

Every step is written to an audit trail showing **who** did it.

## Prerequisites

- Node.js 20+ (built and tested on Node 24)
- A Cloudflare account (only needed for deploying)

## Local setup

```bash
npm install

# Create the local D1 database and apply both migrations.
# Writes to .wrangler/state/v3 — no Cloudflare account required.
npm run db:init

npm run dev
```

Open http://localhost:3000.

### Starting PINs

The migration seeds three people so you can try the whole flow immediately.
**Change these before putting the app in front of staff.**

| Name | Role | PIN |
| --- | --- | --- |
| Admin | admin | `1234` |
| Store Manager | store | `2345` |
| Kitchen | kitchen | `3456` |

Anyone can change their own PIN from **You → Change your PIN**. An admin can set a
PIN for anyone from **People**. Five wrong attempts locks that person out for five
minutes.

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with D1 bindings |
| `npm run db:init` | Apply pending migrations to the **local** D1 database |
| `npm run db:init:remote` | Apply pending migrations to the **remote** D1 database |
| `npm run db:tables` | List tables in the local database |
| `npm run build` | Next.js production build |
| `npm run build:worker` | Bundle the OpenNext Cloudflare Worker |
| `npm run preview` | Build and run the Worker locally via `wrangler` |
| `npm run deploy` | Build and deploy the Worker to Cloudflare |
| `npm run lint` | ESLint |

Migrations live in `migrations/` as plain SQL. `db:init` uses
`wrangler d1 migrations apply`, which records what it has run, so adding a new
`migrations/003_*.sql` is enough — it will be picked up next time. Every
statement is also idempotent (`IF NOT EXISTS`, `INSERT OR IGNORE`), so re-running
is harmless.

## Trying it end to end

1. **Store manager** → *Days* → pick a market day. A list is created for the next one.
2. **Store manager** → *Stock* → add items with a reorder level.
3. **Kitchen** → *Home* → *Report shortage*, or *Stock* to see what's left.
4. **Store manager** → *Trip* → *Start verifying* → adjust quantities → *Send for approval*.
5. **Admin** → *Approvals* → *Approve* (or send back with a comment).
6. **Store manager** → *Trip* → *Start buying* → enter quantity and price per line →
   *Finish and record*.
7. **Kitchen** → *Trip* → enter what actually arrived → *Confirm delivery*.

## Deploying to Cloudflare

```bash
# 1. Create the real D1 database
npx wrangler d1 create market-tracker

# 2. Put the printed database_id into wrangler.toml
#    (replacing the placeholder used for local dev)

# 3. Create the schema on the remote database
npm run db:init:remote

# 4. Build and deploy
npm run deploy
```

The seeded staff come along with the migration. Set new PINs immediately after the
first deploy, or deactivate the seeded accounts from **People** once you have added
your own.

## Architecture

```
src/app/
  login/page.tsx            Name picker + PIN pad
  (app)/layout.tsx          Session gate + app shell (all signed-in pages)
  (app)/page.tsx            Role-aware home
  (app)/trips/…             All lists, and one list in detail
  (app)/inventory/…         Stock          (read-only for kitchen)
  (app)/schedule/…          Market days    (store + admin)
  (app)/history/…           Spending
  (app)/people/…            Staff          (admin)
  (app)/account/…           Your PIN and sign-out
  api/                      Route handlers, each guarded by requireRole/requirePerson

src/lib/
  db.ts         Inventory, market days, purchase ledger
  people.ts     Staff, PIN hashing, sessions, login throttling
  trips.ts      Trips, auto items, status transitions, posting to stock
  auth.ts       Session cookie + role guards
  types.ts      Shared types and the TRANSITIONS permission matrix
  dates.ts      Deterministic date formatting
  page-data.ts  Server-side page loading

src/middleware.ts    Redirects visitors with no cookie to /login
```

### Where the rules live

`TRANSITIONS` in `src/lib/types.ts` is the single source of truth for the workflow:
each action declares the status it applies from, the status it moves to, and the
roles allowed to run it. The API enforces it, and the UI renders its buttons from
it, so the two cannot drift apart.

Access control is layered:

- **middleware** — only checks that a session cookie exists (it runs before the D1
  binding is available, so it cannot verify anything).
- **`(app)/layout.tsx`** — verifies the session and redirects if it is invalid.
- **every API route** — calls `requirePerson()` or `requireRole([...])` itself.

### Data model

| Table | Purpose |
| --- | --- |
| `people` | Staff, role, salted PIN hash |
| `sessions` | Cookie token → person, 30-day expiry |
| `login_attempts` | Failed PIN counts and lockouts |
| `inventory_items` | Ingredients, unit, current quantity, reorder level |
| `market_days` | Which weekdays you shop |
| `market_items` | Which ingredients to buy on a given market day |
| `market_trips` | One list per trip, with its workflow status |
| `trip_items` | The lines, each tagged with where it came from |
| `trip_events` | Append-only audit trail |
| `purchase_history` | The ledger; `total_cost` is a generated column |

Each `trip_item` records its `source` — `kitchen_ran_out`, `kitchen_extra`,
`store_added`, `auto_low_stock` or `auto_schedule` — so the UI can show why a line
is on the list and who asked for it.
