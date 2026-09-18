-- Migration 004: app configuration.
--
-- One row per setting, admin-editable from the Settings screen. Missing keys
-- fall back to the defaults coded in src/lib/settings.ts.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES people(id) ON DELETE SET NULL
);

-- Sensible starting point; the admin can change everything from the UI.
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('company_name', 'My Restaurant'),
  ('company_address', ''),
  ('company_phone', ''),
  ('company_tax_number', ''),
  ('currency', 'AUD'),
  ('timezone', 'Australia/Sydney'),
  ('week_start', '1'),
  ('language', 'en'),
  ('low_stock_alerts', '1'),
  ('low_stock_banner_days', '7'),
  ('require_approval', '1'),
  ('auto_approve_under', '0');
