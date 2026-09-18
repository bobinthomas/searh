"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMoney } from "@/components/shell/SettingsContext";
import { cn } from "@/lib/utils";

/**
 * Week-over-week spend delta. Equal weeks count as "down" (no growth) since
 * rising spend is the thing to catch. Hides itself until there is any history.
 */
export function SpendDelta({
  thisWeek,
  lastWeek,
}: {
  thisWeek: number;
  lastWeek: number;
}) {
  const money = useMoney();

  if (thisWeek === 0 && lastWeek === 0) return null;

  const delta = thisWeek - lastWeek;
  const up = delta > 0;
  const pct =
    lastWeek > 0 ? Math.round((delta / lastWeek) * 100) : up ? 100 : 0;

  return (
    <Card
      className={cn(
        "border",
        up ? "border-amber-500/40" : "border-emerald-500/40",
      )}
    >
      <CardContent className="flex items-center gap-3 pt-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            up
              ? "bg-amber-500/10 text-amber-500"
              : "bg-emerald-500/10 text-emerald-500",
          )}
        >
          {up ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{money(thisWeek)} this week</p>
          <p
            className={cn(
              "text-xs",
              up ? "text-amber-500" : "text-emerald-500",
            )}
          >
            {up ? "↑" : "↓"} {money(Math.abs(delta))}
            {lastWeek > 0 && ` (${up ? "+" : ""}${pct}%)`} vs {money(lastWeek)} last week
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
