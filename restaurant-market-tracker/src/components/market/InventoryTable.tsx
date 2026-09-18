"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { CategoryIcon } from "@/components/ui/category-icon";
import { AddItemDialog } from "./AddItemDialog";
import { postJson, patchJson, deleteJson } from "@/lib/api-client";
import { CATEGORY_ORDER, type InventoryItem } from "@/lib/types";

/**
 * `canEdit` is false for kitchen staff: they see the same list but only as a
 * reference for reporting shortages, so the write controls are hidden (the API
 * enforces the same rule).
 */
export function InventoryTable({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadItems = useCallback(async (): Promise<InventoryItem[]> => {
    const res = await fetch("/api/inventory");
    if (!res.ok) return [];
    return res.json();
  }, []);

  const fetchItems = useCallback(async () => {
    const next = await loadItems().catch(() => null);
    if (next) setItems(next);
  }, [loadItems]);

  useEffect(() => {
    let active = true;
    loadItems()
      .then((next) => {
        if (active) setItems(next);
      })
      .catch(() => {
        // silent
      });
    return () => {
      active = false;
    };
  }, [loadItems]);

  const adjustQuantity = async (id: string, delta: number) => {
    const res = await postJson(`/api/inventory/${id}/adjust`, { delta });
    if (!res.ok) {
      toast.error(res.data.error || "Could not update stock");
      return;
    }
    fetchItems();
  };

  const { confirm, confirmDialog } = useConfirmDialog();

  const removeItem = async (id: string) => {
    const ok = await confirm("Delete this item?", {
      description: "Past purchases keep their history.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteJson(`/api/inventory/${id}`);
    if (!res.ok) {
      toast.error(res.data.error || "Could not delete it");
      return;
    }
    toast.success("Item deleted");
    fetchItems();
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      current_quantity: item.current_quantity,
      min_quantity: item.min_quantity,
      kitchen_tracked: item.kitchen_tracked,
    });
  };

  const saveEdit = async (id: string) => {
    const res = await patchJson(`/api/inventory/${id}`, editForm);
    if (!res.ok) {
      toast.error(res.data.error || "Could not save");
      return;
    }
    setEditingId(null);
    setEditForm({});
    toast.success("Saved");
    fetchItems();
    router.refresh();
  };

  const searched = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()),
  );
  const filtered = categoryFilter
    ? searched.filter((item) => item.category === categoryFilter)
    : searched;

  /** Categories present, in display order, with their item counts. */
  const categories = CATEGORY_ORDER.filter((c) =>
    searched.some((item) => item.category === c),
  )
    .concat(
      // any category not in the standard order (e.g. legacy names)
      [...new Set(searched.map((item) => item.category))].filter(
        (c) => !CATEGORY_ORDER.includes(c),
      ),
    )
    .map((c) => ({
      name: c,
      count: searched.filter((item) => item.category === c).length,
    }));

  /** Groups for the mobile card list: category -> items, display order. */
  const grouped = categories.map((c) => ({
    ...c,
    items: filtered.filter((item) => item.category === c.name),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stock…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      {/* Category chips: tap to focus one category, tap again for all */}
      {categories.length > 1 && (
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {categories.map((c) => {
            const active = categoryFilter === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategoryFilter(active ? null : c.name)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground hover:bg-muted"
                }`}
              >
                <CategoryIcon category={c.name} className="h-3.5 w-3.5" />
                {c.name}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? "bg-primary-foreground/20" : "bg-muted"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cards on small screens, grouped by category */}
      <div className="space-y-4 sm:hidden">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {items.length === 0
              ? "No stock items yet."
              : "Nothing matches your search."}
          </p>
        ) : (
          grouped.map((group) => (
            <section key={group.name}>
              <h3 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground">
                <CategoryIcon category={group.name} className="h-4 w-4" />
                {group.name}
                <span className="rounded-full bg-muted px-2 text-[11px] font-normal">
                  {group.items.length}
                </span>
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <CategoryIcon category={item.category} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.category} · reorder at {item.min_quantity} {item.unit}
                    {item.kitchen_tracked === 0 && " · store"}
                  </p>
                </div>
                {item.min_quantity > 0 &&
                  item.current_quantity <= item.min_quantity && (
                    <Badge variant="destructive">Low</Badge>
                  )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => adjustQuantity(item.id, -1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <span className="w-20 text-center text-sm font-medium">
                    {item.current_quantity} {item.unit}
                  </span>
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => adjustQuantity(item.id, 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <div className="hidden rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reorder at</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 6 : 5}
                  className="py-8 text-center text-muted-foreground"
                >
                  {items.length === 0
                    ? "No stock items yet."
                    : "Nothing matches your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered
                .slice()
                .sort(
                  (a, b) =>
                    categories.findIndex((c) => c.name === a.category) -
                    categories.findIndex((c) => c.name === b.category),
                )
                .map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {editingId === item.id ? (
                      <Input
                        value={editForm.name ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="h-8"
                      />
                    ) : (
                      item.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        value={editForm.category ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                        className="h-8"
                      />
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <CategoryIcon category={item.category} className="h-3 w-3" />
                        {item.category}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                      {editingId === item.id ? (
                        <Input
                          type="number"
                        inputMode="decimal"
                          value={editForm.current_quantity ?? 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              current_quantity: Number(e.target.value),
                            })
                          }
                          className="h-8 w-20 text-center"
                        />
                      ) : (
                        <span className="w-16 text-center font-mono text-sm">
                          {item.current_quantity} {item.unit}
                        </span>
                      )}
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={editForm.min_quantity ?? 0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            min_quantity: Number(e.target.value),
                          })
                        }
                        className="h-8 w-20"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {item.min_quantity}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={editForm.kitchen_tracked !== 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              kitchen_tracked: e.target.checked ? 1 : 0,
                            })
                          }
                        />
                        kitchen
                      </label>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {item.kitchen_tracked === 0 ? "store" : "kitchen"}
                      </span>
                    )}
                    {item.min_quantity > 0 &&
                      item.current_quantity <= item.min_quantity && (
                        <Badge variant="destructive">Low</Badge>
                      )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === item.id ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveEdit(item.id)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(null);
                                setEditForm({});
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={() => {
          fetchItems();
          setShowAddDialog(false);
          router.refresh();
        }}
      />
      {confirmDialog}
    </div>
  );
}
