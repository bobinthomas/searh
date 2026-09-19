"use client";

import { useState } from "react";
import { Minus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { deleteJson, patchJson } from "@/lib/api-client";
import { useMoney } from "@/components/shell/SettingsContext";
import { SourceTag } from "./StatusPill";
import { cn } from "@/lib/utils";
import type { SafePerson, TripItem, TripStatus } from "@/lib/types";

const ORDER_EDIT_STATUSES: TripStatus[] = [
  "collecting",
  "reviewing",
  "pending_approval",
];

export function TripItemRow({
  item,
  person,
  tripStatus,
  onChanged,
}: {
  item: TripItem;
  person: SafePerson;
  tripStatus: TripStatus;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  // Drafts hold what is being typed; null shows the saved value. Deriving the
  // shown value from `item` on every render keeps prefills current after a
  // refresh (the row stays mounted, so useState initialisers would go stale).
  const [needDraft, setNeedDraft] = useState<string | null>(null);
  const [buyDraft, setBuyDraft] = useState<string | null>(null);
  const [purchaseDraft, setPurchaseDraft] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string | null>(null);
  const [receivedDraft, setReceivedDraft] = useState<string | null>(null);

  const purchaseQty =
    purchaseDraft ??
    String(item.purchased_qty ?? item.approved_qty ?? item.requested_qty ?? 1);
  const price =
    priceDraft ?? (item.unit_price != null ? String(item.unit_price) : "");
  const receivedQty =
    receivedDraft ?? String(item.received_qty ?? item.purchased_qty ?? "");

  const money = useMoney();

  const isStoreOrAdmin = person.role === "store" || person.role === "admin";
  const dropped = item.status === "dropped";

  // Who may shape the order, and when.
  const showOrderControls =
    (isStoreOrAdmin && ORDER_EDIT_STATUSES.includes(tripStatus)) ||
    (person.role === "admin" && tripStatus === "pending_approval");
  // Kitchen can still right-size their own needs while the list is collecting.
  const showKitchenQtyControls =
    person.role === "kitchen" && tripStatus === "collecting" && !dropped;
  const showPurchaseControls = isStoreOrAdmin && tripStatus === "purchasing";
  const showReceiveControls =
    (person.role === "kitchen" || person.role === "admin") &&
    tripStatus === "purchased";

  const canRemove =
    (isStoreOrAdmin && ORDER_EDIT_STATUSES.includes(tripStatus)) ||
    (person.role === "kitchen" &&
      item.requested_by === person.id &&
      tripStatus === "collecting");

  const approvedQty = item.approved_qty ?? item.requested_qty;

  const patch = async (
    body: Record<string, unknown>,
    message?: string,
  ): Promise<boolean> => {
    setBusy(true);
    const res = await patchJson(`/api/trips/${item.trip_id}/items/${item.id}`, body);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.data.error || "Could not save");
      return false;
    }
    if (message) toast.success(message);
    onChanged();
    return true;
  };

  /** Saves a typed Need/Buy quantity when the field is left, not per
   * keystroke: clearing the box to retype must not save 0. */
  const commitQty = (
    field: "requested_qty" | "approved_qty",
    draft: string | null,
    saved: number,
    clear: () => void,
  ) => {
    if (draft === null) return;
    clear();
    const next = Number(draft);
    if (draft.trim() === "" || next === saved) return;
    if (!Number.isFinite(next) || next <= 0) {
      toast.error("Quantity must be more than 0");
      return;
    }
    void patch({ [field]: next });
  };

  const qtyKeys = (clear: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") clear();
  };

  const remove = async () => {
    setBusy(true);
    const res = await deleteJson(`/api/trips/${item.trip_id}/items/${item.id}`);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.data.error || "Could not remove");
      return;
    }
    toast.success("Removed");
    onChanged();
  };

  const stepApproved = (delta: number) => {
    setBuyDraft(null);
    const next = Math.max(0.5, Math.round((approvedQty + delta) * 10) / 10);
    void patch({ approved_qty: next });
  };

  const stepRequested = (delta: number) => {
    setNeedDraft(null);
    const next = Math.max(0.5, Math.round(((item.requested_qty ?? 1) + delta) * 10) / 10);
    void patch({ requested_qty: next });
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        dropped && "opacity-60",
        item.status === "received" && "border-emerald-500/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "truncate text-sm font-medium",
                dropped && "line-through",
              )}
            >
              {item.name}
            </span>
            <SourceTag source={item.source} />
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {tripStatus === "purchasing" || tripStatus === "purchased" ? (
              <>Buy {approvedQty} {item.unit}</>
            ) : (
              <>Asked for {item.requested_qty} {item.unit}</>
            )}
            {item.current_quantity != null && (
              <> · {item.current_quantity} in stock</>
            )}
            {item.store && <> · {item.store}</>}
            {item.requested_by_name && <> · {item.requested_by_name}</>}
          </p>

          {item.purchased_qty != null && (
            <p className="mt-1 text-xs">
              Bought {item.purchased_qty} {item.unit}
              {item.unit_price ? ` @ ${money(item.unit_price)}` : ""}
              {item.received_qty != null && (
                <>
                  {" · "}
                  <span
                    className={cn(
                      item.received_qty < item.purchased_qty
                        ? "font-medium text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    received {item.received_qty}
                    {item.received_qty < item.purchased_qty && " — short"}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {dropped && showOrderControls && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              disabled={busy}
              title="Put back on the list"
              onClick={() => patch({ status: "pending" }, "Put back on the list")}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {!dropped && canRemove && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive"
              disabled={busy}
              title={isStoreOrAdmin ? "Drop from the list" : "Remove my request"}
              onClick={() =>
                isStoreOrAdmin
                  ? patch({ status: "dropped" }, "Dropped from the list")
                  : remove()
              }
            >
              {isStoreOrAdmin ? (
                <X className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Kitchen right-sizing a need while the list is still collecting */}
      {showKitchenQtyControls && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Need</span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={busy}
              onClick={() => stepRequested(-1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
                        inputMode="decimal"
              min="0.5"
              step="0.5"
              value={needDraft ?? String(item.requested_qty ?? 1)}
              disabled={busy}
              onChange={(e) => setNeedDraft(e.target.value)}
              onBlur={() =>
                commitQty("requested_qty", needDraft, item.requested_qty ?? 1, () =>
                  setNeedDraft(null),
                )
              }
              onKeyDown={qtyKeys(() => setNeedDraft(null))}
              className="h-9 w-16 text-center"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={busy}
              onClick={() => stepRequested(1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">{item.unit}</span>
          </div>
        </div>
      )}

      {/* Store manager / admin shaping the order */}
      {!dropped && showOrderControls && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Buy</span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={busy}
              onClick={() => stepApproved(-1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
                        inputMode="decimal"
              min="0.5"
              step="0.5"
              value={buyDraft ?? String(approvedQty)}
              disabled={busy}
              onChange={(e) => setBuyDraft(e.target.value)}
              onBlur={() =>
                commitQty("approved_qty", buyDraft, approvedQty, () =>
                  setBuyDraft(null),
                )
              }
              onKeyDown={qtyKeys(() => setBuyDraft(null))}
              className="h-9 w-16 text-center"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={busy}
              onClick={() => stepApproved(1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">{item.unit}</span>
          </div>
        </div>
      )}

      {/* Store manager recording what was actually bought */}
      {!dropped && showPurchaseControls && (
        <div className="mt-2 flex items-end gap-2">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground">
              Bought
            </span>
            <Input
              type="number"
                        inputMode="decimal"
              min="0"
              step="0.1"
              value={purchaseQty}
              onChange={(e) => setPurchaseDraft(e.target.value)}
              className="h-9 w-20"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground">
              {money(0).replace(/[\d.,]/g, "")} per {item.unit}
            </span>
            <Input
              type="number"
                        inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPriceDraft(e.target.value)}
              className="h-9 w-24"
            />
          </div>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              const saved = await patch(
                {
                  purchased_qty: Number(purchaseQty) || 0,
                  unit_price: Number(price) || 0,
                },
                "Saved",
              );
              if (saved) {
                setPurchaseDraft(null);
                setPriceDraft(null);
              }
            }}
          >
            Save
          </Button>
        </div>
      )}

      {/* Kitchen confirming the delivery */}
      {!dropped && showReceiveControls && (
        <div className="mt-2 flex items-end gap-2">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground">
              Actually received ({item.unit})
            </span>
            <Input
              type="number"
                        inputMode="decimal"
              min="0"
              step="0.1"
              value={receivedQty}
              onChange={(e) => setReceivedDraft(e.target.value)}
              className="h-9 w-24"
            />
          </div>
          <Button
            size="sm"
            disabled={busy || receivedQty === ""}
            onClick={async () => {
              if (
                await patch({ received_qty: Number(receivedQty) }, "Delivery saved")
              ) {
                setReceivedDraft(null);
              }
            }}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
