"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoney } from "@/components/shell/SettingsContext";
import { formatShortDate } from "@/lib/dates";

/** Consistent palette, same hues as the category chips elsewhere. */
const COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#a3a3a3",
];

interface TrendPoint {
  week_start: string;
  total: number;
}

interface CategoryPoint {
  category: string;
  total: number;
}

export function SpendCharts({ weeks = 12 }: { weeks?: number }) {
  const money = useMoney();
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/analytics?weeks=${weeks}`)
      .then((res) => (res.ok ? res.json() : { trend: [], byCategory: [] }))
      .then((data) => {
        if (active) {
          setTrend(data.trend ?? []);
          setByCategory(data.byCategory ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setTrend([]);
          setByCategory([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [weeks]);

  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Loading charts…
      </p>
    );
  }

  const hasData = trend.some((t) => t.total > 0) || byCategory.length > 0;
  if (!hasData) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No spending recorded yet — charts appear after the first purchase is
        recorded.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly spend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="week_start"
                tickFormatter={(v: string) => formatShortDate(v)}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                formatter={(value) => [money(Number(value)), "Spent"]}
                labelFormatter={(label) => `Week of ${formatShortDate(String(label))}`}
              />
              <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spend by category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="category"
                width={90}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(value) => [money(Number(value)), "Spent"]} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
