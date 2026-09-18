"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/components/shell/SettingsContext";
import {
  CalendarDays,
  ClipboardList,
  History,
  Home,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role, type SafePerson } from "@/lib/types";

interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Bottom tabs per role. Kept to at most five so they stay tappable one-handed;
 * anything less frequent lives on the home screen.
 */
const TABS: Record<Role, NavTab[]> = {
  kitchen: [
    { href: "/", label: "Home", icon: Home },
    { href: "/trips", label: "Requests", icon: ClipboardList },
    { href: "/inventory", label: "Stock", icon: Package },
    { href: "/history", label: "History", icon: History },
  ],
  store: [
    { href: "/", label: "Home", icon: Home },
    { href: "/trips", label: "Trip", icon: ClipboardList },
    { href: "/inventory", label: "Stock", icon: Package },
    { href: "/schedule", label: "Days", icon: CalendarDays },
    { href: "/history", label: "History", icon: History },
  ],
  admin: [
    { href: "/", label: "Home", icon: Home },
    { href: "/trips", label: "Approvals", icon: ClipboardList },
    { href: "/inventory", label: "Stock", icon: Package },
    { href: "/people", label: "People", icon: Users },
    { href: "/history", label: "History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  person,
  children,
}: {
  person: SafePerson;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tabs = TABS[person.role];
  const { company_name } = useSettings();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            {company_name}
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            <span className="font-medium">{person.name}</span>
            <span className="text-muted-foreground">
              {ROLE_LABELS[person.role]}
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-28">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex w-full max-w-3xl">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", active && "text-primary")}
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
