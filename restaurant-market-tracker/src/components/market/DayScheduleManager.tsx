"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Minus, Trash2, Calendar } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { CATEGORY_ORDER } from "@/lib/types";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ChevronDown } from "lucide-react";
import { DAY_NAMES } from "@/lib/types";
import type { MarketDay, MarketItem, InventoryItem } from "@/lib/types";

interface MarketDayWithItems extends MarketDay {
  items: MarketItem[];
}

export function DayScheduleManager() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [days, setDays] = useState<MarketDayWithItems[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    inventory_item_id: "",
    default_quantity: 1,
  });

  const loadSchedule = useCallback(async () => {
    const [scheduleRes, inventoryRes] = await Promise.all([
      fetch("/api/schedule"),
      fetch("/api/inventory"),
    ]);
    return {
      days: (scheduleRes.ok
        ? await scheduleRes.json()
        : []) as MarketDayWithItems[],
      allItems: (inventoryRes.ok
        ? await inventoryRes.json()
        : []) as InventoryItem[],
    };
  }, []);

  // Used by event handlers after a mutation.
  const fetchSchedule = useCallback(async () => {
    const next = await loadSchedule().catch(() => null);
    if (next) {
      setDays(next.days);
      setAllItems(next.allItems);
    }
  }, [loadSchedule]);

  useEffect(() => {
    let active = true;
    loadSchedule()
      .then((next) => {
        if (!active) return;
        setDays(next.days);
        setAllItems(next.allItems);
      })
      .catch(() => {
        // silent
      });
    return () => {
      active = false;
    };
  }, [loadSchedule]);

  const toggleDay = async (dow: number) => {
    const existing = days.find((d) => d.day_of_week === dow);
    if (existing) {
      const ok = await confirm(`Remove ${DAY_NAMES[dow]} from market schedule?`, {
        description: "Its items stay in stock but will not appear on a weekly list.",
        confirmLabel: "Remove",
        destructive: true,
      });
      if (!ok) return;
      await fetch(`/api/schedule/${existing.id}`, { method: "DELETE" });
    } else {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_of_week: dow }),
      });
    }
    fetchSchedule();
  };

  const addItemToDay = async () => {
    if (!selectedDay || !newItem.inventory_item_id) return;

    await fetch(`/api/schedule/${selectedDay}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    setShowAddItem(false);
    setNewItem({ inventory_item_id: "", default_quantity: 1 });
    fetchSchedule();
  };

  const removeItemFromDay = async (dayId: string, itemId: string) => {
    await fetch(`/api/schedule/${dayId}/items/${itemId}`, {
      method: "DELETE",
    });
    fetchSchedule();
  };

  const setItemQuantity = async (
    dayId: string,
    itemId: string,
    default_quantity: number,
  ) => {
    if (!Number.isFinite(default_quantity) || default_quantity <= 0) return;
    await fetch(`/api/schedule/${dayId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_quantity }),
    });
    fetchSchedule();
  };

  const activeDays = days.map((d) => d.day_of_week);

  return (
    <div className="space-y-6">
      {/* Day Toggle Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Market Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((name, dow) => {
              const isActive = activeDays.includes(dow);
              return (
                <Button
                  key={dow}
                  variant={isActive ? "default" : "outline"}
                  className={`h-auto py-3 flex flex-col items-center gap-1 ${
                    isActive ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => toggleDay(dow)}
                >
                  <span className="text-xs font-medium">{name.slice(0, 3)}</span>
                  {isActive && <Badge className="text-[10px]">Active</Badge>}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Details */}
      {days
        .sort((a, b) => a.day_of_week - b.day_of_week)
        .map((day) => (
          <Card key={day.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold tracking-tight">
                    {DAY_NAMES[day.day_of_week]}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {day.items.length} item{day.items.length === 1 ? "" : "s"} on this list
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDay(day.id);
                    setShowAddItem(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {day.items.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No items assigned to this day yet.
                </p>
              ) : (
                <GroupedDayItems
                  items={day.items}
                  dayId={day.id}
                  onQuantity={(itemId, q) => setItemQuantity(day.id, itemId, q)}
                  onRemove={(itemId) => removeItemFromDay(day.id, itemId)}
                />
              )}
            </CardContent>
          </Card>
        ))}

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Market Day</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Item</Label>
              <Select
                value={newItem.inventory_item_id}
                onValueChange={(v) =>
                  setNewItem({ ...newItem, inventory_item_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {allItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Quantity to Buy</Label>
              <Input
                type="number"
                        inputMode="decimal"
                min="0.1"
                step="0.1"
                value={newItem.default_quantity}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    default_quantity: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={addItemToDay}
              disabled={!newItem.inventory_item_id}
            >
              Add to Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}

/**
 * Items of one market day grouped under collapsible category headers, so a
 * 60-item day reads like a shopping list instead of a wall. Groups follow the
 * shared CATEGORY_ORDER; only groups that exist on this day appear.
 */
function GroupedDayItems({
  items,
  onQuantity,
  onRemove,
}: {
  items: MarketItem[];
  dayId: string;
  onQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}) {
  const groups = new Map<string, MarketItem[]>();
  for (const item of items) {
    const key = item.item_category || "Misc";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const sortedKeys = [...groups.keys()].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a === "Misc" ? "zz" : a) -
        CATEGORY_ORDER.indexOf(b === "Misc" ? "zz" : b) ||
      a.localeCompare(b),
  );

  return (
    <div className="space-y-3">
      {sortedKeys.map((key, i) => (
        <details key={key} open={i === 0} className="group/cat">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border bg-card px-3 py-3 transition-colors hover:bg-muted/70">
            <CategoryIcon category={key} className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold tracking-tight">{key}</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {groups.get(key)!.length}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/cat:rotate-180" />
            </span>
          </summary>
          <div className="mt-2 space-y-2">
            {groups.get(key)!.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md bg-muted/50 p-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{item.item_name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() =>
                        onQuantity(item.id, Math.max(0.5, item.default_quantity - 1))
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                        inputMode="decimal"
                      min="0.5"
                      step="0.5"
                      defaultValue={item.default_quantity}
                      key={`${item.id}-${item.default_quantity}`}
                      className="h-9 w-14 px-1 text-center text-sm"
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (next !== item.default_quantity) {
                          onQuantity(item.id, next);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => onQuantity(item.id, item.default_quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {item.item_unit}
                    </span>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    (stock: {item.current_quantity})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
