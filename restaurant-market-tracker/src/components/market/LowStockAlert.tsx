"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { InventoryItem } from "@/lib/types";

interface LowStockAlertProps {
  /** Bump this to refetch — e.g. after a purchase changes stock levels. */
  refreshKey?: number;
}

export function LowStockAlert({ refreshKey = 0 }: LowStockAlertProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Fetches and returns the data; the caller decides how to store it. Keeping
  // this free of setState lets the effect below update state in a continuation
  // instead of synchronously, which avoids cascading renders.
  const loadLowStock = useCallback(async (): Promise<InventoryItem[]> => {
    const res = await fetch("/api/inventory");
    if (!res.ok) return [];
    const all: InventoryItem[] = await res.json();
    return all.filter(
      (i) => i.min_quantity > 0 && i.current_quantity <= i.min_quantity
    );
  }, []);

  useEffect(() => {
    let active = true;
    loadLowStock()
      .then((next) => {
        if (active) setItems(next);
      })
      .catch(() => {
        // silent
      });
    return () => {
      active = false;
    };
  }, [loadLowStock, refreshKey]);

  if (items.length === 0) return null;

  return (
    <Card className="border-amber-500/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Low Stock Alerts ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-md bg-amber-500/5"
            >
              <div>
                <span className="font-medium">{item.name}</span>
                <Badge variant="outline" className="ml-2 gap-1 text-xs">
                  <CategoryIcon category={item.category} className="h-3 w-3" />
                  {item.category}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="text-destructive font-medium">
                  {item.current_quantity}
                </span>
                <span className="text-muted-foreground">
                  {" "}/{item.min_quantity} {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
