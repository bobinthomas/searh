"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/**
 * Flips #site-root's data-theme attribute directly (not via React state
 * driving the attribute) so this stays consistent with the inline init
 * script in app/(site)/layout.tsx and never fights hydration.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const root = document.getElementById("site-root");
    const current = root?.getAttribute("data-theme");
    if (current === "dark" || current === "light") setTheme(current);
  }, []);

  const toggle = () => {
    const root = document.getElementById("site-root");
    if (!root) return;
    const next: Theme = theme === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable (private mode, etc) — theme just won't persist.
    }
    setTheme(next);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      data-reveal
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-[var(--color-ink)]/15 bg-[var(--color-ink)]/5 transition-colors"
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] transition-transform duration-300 ${
          isDark ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      >
        {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </span>
    </button>
  );
}
