"use client";

import { createContext, useContext, type ReactNode } from "react";
import { currencySymbol, type AppSettings } from "@/lib/settings";

const SettingsContext = createContext<AppSettings | null>(null);

/** Server component wrapper: passes settings fetched on the server. */
export function SettingsProvider({
  settings,
  children,
}: {
  settings: AppSettings;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

/** Read app settings inside client components. */
export function useSettings(): AppSettings {
  const settings = useContext(SettingsContext);
  // Fall back to defaults so a missing provider never crashes a page.
  if (!settings) {
    // Imported lazily to keep this module client-safe.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@/lib/settings").DEFAULT_SETTINGS as AppSettings;
  }
  return settings;
}

/** Format a money amount with the configured currency symbol. */
export function useMoney() {
  const settings = useSettings();
  return (amount: number) => `${currencySymbol(settings.currency)}${amount.toFixed(2)}`;
}
