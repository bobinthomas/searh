"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/api-client";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { InventoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Two ways to add to the list: tap an item you already track ("Ran out"), or
 * describe something that isn't tracked yet ("Something else").
 */
export function ReportItemDialog({
  tripId,
  open,
  onOpenChange,
}: {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-4 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to the market list</DialogTitle>
          <DialogDescription>
            Requests raised on a non-market day queue up for the next trip.
          </DialogDescription>
        </DialogHeader>
        {/* Remounted on each open, so the form always starts clean. */}
        {open && (
          <ReportForm
            tripId={tripId}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportForm({
  tripId,
  onDone,
}: {
  tripId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [choice, setChoice] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState("1");
  const [freeName, setFreeName] = useState("");
  const [freeUnit, setFreeUnit] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/inventory")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: InventoryItem[]) => {
        // The kitchen reports food shortages; store-managed items (cleaning,
        // packaging, office...) never belong in this picker.
        if (active) setItems(list.filter((i) => i.kitchen_tracked !== 0));
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Low stock at the top — that is what the kitchen came here for.
  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category))].sort(),
    [items],
  );
  const sorted = useMemo(() => {
    const rank = (i: InventoryItem) =>
      i.min_quantity > 0 && i.current_quantity <= i.min_quantity ? 0 : 1;
    return [...items].sort((a, b) => rank(a) - rank(b));
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const pool = category ? sorted.filter((i) => i.category === category) : sorted;
    if (!term) return pool;
    return pool.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term),
    );
  }, [sorted, search, category]);

  const submit = async (payload: Record<string, unknown>) => {
    setBusy(true);
    const res = await postJson<{ merged?: boolean }>(
      `/api/trips/${tripId}/items`,
      payload,
    );
    setBusy(false);

    if (!res.ok) {
      toast.error(res.data.error || "Could not add that");
      return;
    }
    toast.success(res.data.merged ? "Updated on the list" : "Added to the list");
    onDone();
    router.refresh();
  };

  return (
    <Tabs defaultValue="ran_out">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ran_out">Ran out</TabsTrigger>
        <TabsTrigger value="extra">Something else</TabsTrigger>
      </TabsList>

      {/* ── Ran out ─────────────────────────────────────── */}
      <TabsContent value="ran_out" className="space-y-3 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your stock…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {categories.length > 1 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              key="__all"
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                category === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground",
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(category === cat ? null : cat)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                  category === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                <CategoryIcon
                  category={cat}
                  className={cn(
                    "h-3.5 w-3.5",
                    category === cat ? "text-current" : "text-muted-foreground",
                  )}
                />
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing matches. Use “Something else” to add it.
            </p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setChoice(item)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  choice?.id === item.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted",
                )}
              >
                <span className="font-medium">{item.name}</span>
                <span
                  className={cn(
                    "text-xs",
                    item.min_quantity > 0 &&
                      item.current_quantity <= item.min_quantity
                      ? "font-medium text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {item.current_quantity} {item.unit} left
                </span>
              </button>
            ))
          )}
        </div>

        {choice && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="ran-out-qty">How much? ({choice.unit})</Label>
              <Input
                id="ran-out-qty"
                type="number"
                min="0.1"
                step="0.1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <Button
              disabled={busy || !Number(qty)}
              onClick={() =>
                submit({
                  kind: "ran_out",
                  inventory_item_id: choice.id,
                  requested_qty: Number(qty),
                })
              }
            >
              {busy ? "Adding…" : "Add"}
            </Button>
          </div>
        )}
      </TabsContent>

      {/* ── Extra need ──────────────────────────────────── */}
      <TabsContent value="extra" className="space-y-3 pt-3">
        <div className="space-y-1.5">
          <Label htmlFor="extra-name">What do you need?</Label>
          <Input
            id="extra-name"
            placeholder="e.g. Birthday candles"
            value={freeName}
            onChange={(e) => setFreeName(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="w-24 space-y-1.5">
            <Label htmlFor="extra-qty">Qty</Label>
            <Input
              id="extra-qty"
              type="number"
              min="0.1"
              step="0.1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="extra-unit">Unit</Label>
            <Input
              id="extra-unit"
              placeholder="kg, packets…"
              value={freeUnit}
              onChange={(e) => setFreeUnit(e.target.value)}
            />
          </div>
          <Button
            disabled={busy || !freeName.trim() || !Number(qty)}
            onClick={() =>
              submit({
                kind: "extra",
                name: freeName.trim(),
                unit: freeUnit.trim() || "unit",
                requested_qty: Number(qty),
              })
            }
          >
            {busy ? "Adding…" : "Add"}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
