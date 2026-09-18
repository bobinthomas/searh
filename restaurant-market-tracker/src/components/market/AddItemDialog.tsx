"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, STORE_ONLY_CATEGORIES } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddItemDialog({ open, onOpenChange, onCreated }: AddItemDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Produce");
  const [unit, setUnit] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [kitchenTracked, setKitchenTracked] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unit) return;

    setLoading(true);
    try {
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          unit,
          current_quantity: currentQuantity,
          min_quantity: minQuantity,
          kitchen_tracked: kitchenTracked ? 1 : 0,
        }),
      });
      setName("");
      setCategory("Produce");
      setUnit("");
      setCurrentQuantity(0);
      setMinQuantity(0);
      setKitchenTracked(true);
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Tomatoes, Rice, Chicken"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  // Store-only categories default to kitchen not tracking.
                  setKitchenTracked(!STORE_ONLY_CATEGORIES.has(v));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                placeholder="kg, litres, pieces"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Current Quantity</Label>
              <Input
                id="qty"
                type="number"
                        inputMode="decimal"
                min="0"
                step="0.1"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min">Reorder At (min)</Label>
              <Input
                id="min"
                type="number"
                        inputMode="decimal"
                min="0"
                step="0.1"
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="kitchen"
              checked={kitchenTracked}
              onCheckedChange={(v) => setKitchenTracked(v === true)}
            />
            <Label htmlFor="kitchen" className="font-normal">
              Kitchen tracks this item (kitchen reports shortages for it)
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !name || !unit}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
