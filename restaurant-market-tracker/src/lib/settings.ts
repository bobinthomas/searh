// App configuration: one settings row per key, admin-editable.
//
// Reads go through getSettings() which merges DB rows over the coded
// defaults, so a missing or future key never breaks the app.

import { d1All, d1Run, type D1Client } from "./db";

export const CURRENCIES = [
  { code: "AUD", symbol: "$", label: "Australian Dollar ($)" },
  { code: "INR", symbol: "₹", label: "Indian Rupee (₹)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham (د.إ)" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (S$)" },
] as const;

export const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

export type AppSettings = {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_tax_number: string;
  currency: string;
  timezone: string;
  /** 0 = Sunday … 6 = Saturday */
  week_start: string;
  language: string;
  low_stock_alerts: "0" | "1";
  low_stock_banner_days: string;
  /** Admin must approve every list before purchase (0/1). */
  require_approval: "0" | "1";
  /** Lists totalling under this amount skip admin approval. 0 = never. */
  auto_approve_under: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  company_name: "My Restaurant",
  company_address: "",
  company_phone: "",
  company_tax_number: "",
  currency: "AUD",
  timezone: "Australia/Sydney",
  week_start: "1",
  language: "en",
  low_stock_alerts: "1",
  low_stock_banner_days: "7",
  require_approval: "1",
  auto_approve_under: "0",
};

export const SETTINGS_LABELS: Record<keyof AppSettings, string> = {
  company_name: "Company name",
  company_address: "Address",
  company_phone: "Phone",
  company_tax_number: "Tax number (ABN/GST)",
  currency: "Currency",
  timezone: "Timezone",
  week_start: "Week starts on",
  language: "Language",
  low_stock_alerts: "Low stock alerts",
  low_stock_banner_days: "Low stock look-ahead (days)",
  require_approval: "Require admin approval",
  auto_approve_under: "Auto-approve lists under",
};

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";
}

/** Validate + coerce an incoming settings patch. Returns error message or null. */
export function validateSettings(
  patch: Record<string, unknown>,
): { key: keyof AppSettings; value: string }[] | string {
  const updates: { key: keyof AppSettings; value: string }[] = [];

  for (const [key, raw] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) return `Unknown setting "${key}"`;
    const k = key as keyof AppSettings;
    const value = String(raw ?? "").trim();

    switch (k) {
      case "company_name":
        if (!value || value.length > 120) return "Company name is required (max 120 chars)";
        break;
      case "company_address":
      case "company_phone":
        if (value.length > 300) return "Too long";
        break;
      case "company_tax_number":
        if (value.length > 40) return "Tax number too long";
        break;
      case "currency":
        if (!CURRENCIES.some((c) => c.code === value)) return "Unknown currency";
        break;
      case "timezone":
        if (!TIMEZONES.includes(value as (typeof TIMEZONES)[number]))
          return "Unsupported timezone";
        break;
      case "week_start": {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0 || n > 6) return "Week start must be 0-6";
        break;
      }
      case "low_stock_alerts":
      case "require_approval":
        if (value !== "0" && value !== "1") return "Must be on or off";
        break;
      case "low_stock_banner_days":
      case "auto_approve_under": {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 100000) return "Enter a number between 0 and 100000";
        break;
      }
      case "language":
        if (!/^[a-z-]{2,10}$/i.test(value)) return "Invalid language code";
        break;
    }
    updates.push({ key: k, value });
  }
  return updates;
}

export async function getSettings(db: D1Client): Promise<AppSettings> {
  const rows = await d1All<{ key: string; value: string }>(
    db,
    "SELECT key, value FROM settings",
  );
  const merged: AppSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (key in merged) {
      (merged as Record<string, string>)[key] = value;
    }
  }
  return merged;
}

export async function updateSettings(
  db: D1Client,
  updates: { key: keyof AppSettings; value: string }[],
  updatedBy: string,
): Promise<void> {
  for (const { key, value } of updates) {
    await d1Run(
      db,
      `INSERT INTO settings (key, value, updated_by) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`,
      key,
      value,
      updatedBy,
    );
  }
}
