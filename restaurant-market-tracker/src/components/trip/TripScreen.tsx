"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Plus,
  Store as StoreIcon,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportItemDialog } from "./ReportItemDialog";
import { StatusPill } from "./StatusPill";
import { TripItemRow } from "./TripItemRow";
import { CategoryIcon } from "@/components/ui/category-icon";
import { postJson } from "@/lib/api-client";
import { useMoney } from "@/components/shell/SettingsContext";
import { formatDayDate, formatTimestampIn } from "@/lib/dates";
import { useSettings } from "@/components/shell/SettingsContext";
import {
  CATEGORY_ORDER,
  TRANSITIONS,
  TRIP_STEPS,
  availableActions,
  tripStep,
  type MarketTrip,
  type SafePerson,
  type TripAction,
  type TripItem,
  type TripStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** What this person should do next, in plain words. */
function guidance(role: SafePerson["role"], status: TripStatus): string {
  if (status === "received") return "This trip is finished.";
  if (status === "pending_approval") {
    return role === "admin"
      ? "Approve this list, or send it back with a comment."
      : "Waiting for the admin to approve.";
  }
  switch (role) {
    case "kitchen":
      if (status === "purchased")
        return "Confirm what actually turned up so short deliveries get caught.";
      return "Add anything you have run out of. The store manager verifies this list.";
    case "store":
      if (status === "collecting")
        return "Check what the kitchen reported, add anything missing, then send it for approval.";
      if (status === "reviewing")
        return "Set the quantities to buy, then send it for approval.";
      if (status === "approved") return "Approved — start buying when you reach the market.";
      if (status === "purchasing")
        return "Record what you actually bought and the price you paid.";
      return "Waiting on the kitchen to confirm delivery.";
    default:
      return "You can approve, edit or send this list back.";
  }
}

export function TripScreen({
  trip,
  person,
}: {
  trip: MarketTrip;
  person: SafePerson;
}) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const items = trip.items ?? [];
  const refresh = () => router.refresh();
  const money = useMoney();
  const settings = useSettings();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [groupByStore, setGroupByStore] = useState(false);

  const actions = availableActions(person.role, trip.status);
  const primary = actions.find((a) => TRANSITIONS[a].primary);
  const secondary = actions.filter((a) => a !== primary);

  const live = items.filter((i) => i.status !== "dropped");
  const dropped = items.filter((i) => i.status === "dropped");

  const needed = live.reduce(
    (sum, i) => sum + (i.approved_qty ?? i.requested_qty ?? 0),
    0,
  );
  const estimated = live.reduce(
    (sum, i) =>
      sum +
      (i.purchased_qty ?? i.approved_qty ?? i.requested_qty ?? 0) *
        (i.unit_price ?? 0),
    0,
  );
  const shortLines = live.filter(
    (i) => i.received_qty != null && i.purchased_qty != null && i.received_qty < i.purchased_qty,
  );

  const canAdd = ["collecting", "reviewing"].includes(trip.status);
  const stepIndex = tripStep(trip.status);

  const runAction = async (action: TripAction, comment = "") => {
    setBusy(true);
    const res = await postJson(`/api/trips/${trip.id}/actions`, {
      action,
      note: comment,
    });
    setBusy(false);

    if (!res.ok) {
      toast.error(res.data.error || "Could not update the list");
      return;
    }
    toast.success(TRANSITIONS[action].label + " done");
    setSendBackOpen(false);
    setNote("");
    refresh();
  };

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0">
      {/* Status — sidebar column on tablet */}
      <Card className="lg:sticky lg:top-20 lg:col-start-1 lg:row-start-1">
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Trip to market
              </p>
              <p className="text-lg font-bold">
                {formatDayDate(trip.trip_date)}
              </p>
            </div>
            <StatusPill status={trip.status} />
          </div>

          {/* Progress */}
          <div className="flex gap-1" aria-hidden>
            {TRIP_STEPS.map((step, i) => (
              <span
                key={step}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= stepIndex ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {guidance(person.role, trip.status)}
          </p>

          {trip.rejection_note && trip.status === "reviewing" && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive">
                Sent back by the admin
              </p>
              <p className="mt-1 text-sm">{trip.rejection_note}</p>
            </div>
          )}

          {shortLines.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Short deliveries
              </p>
              <p className="mt-1 text-sm">
                {shortLines
                  .map((i) => `${i.name}: ${i.received_qty} of ${i.purchased_qty}`)
                  .join(", ")}
              </p>
            </div>
          )}

          {/* Actions */}
          {(primary || secondary.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {primary && (
                <Button
                  disabled={busy}
                  onClick={() => void runAction(primary)}
                  className="flex-1"
                >
                  {TRANSITIONS[primary].label}
                </Button>
              )}
              {secondary.map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  disabled={busy}
                  onClick={() => setSendBackOpen(true)}
                >
                  {TRANSITIONS[action].label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* The list */}
      <Card className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {live.length} item{live.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">
                {needed} units needed
                {estimated > 0 && ` · ${money(estimated)} recorded`}
              </p>
            </div>
            {canAdd && (
              <Button size="sm" onClick={() => setReportOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            )}
          </div>

          {live.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing on this list yet.
            </p>
          ) : (
            <CategoryGroupedItems
              items={live}
              person={person}
              tripStatus={trip.status}
              onChanged={refresh}
              filter={categoryFilter}
              onFilterChange={setCategoryFilter}
              groupByStore={groupByStore}
              onGroupByStoreChange={setGroupByStore}
            />
          )}

          {dropped.length > 0 && (
            <details className="pt-1">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {dropped.length} dropped line{dropped.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-2 space-y-2">
                {dropped.map((item) => (
                  <TripItemRow
                    key={item.id}
                    item={item}
                    person={person}
                    tripStatus={trip.status}
                    onChanged={refresh}
                  />
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Who did what */}
      {(trip.events?.length ?? 0) > 0 && (
        <Card className="lg:col-start-1 lg:row-start-2">
          <CardContent className="pt-5">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4" />
                History
              </summary>
              <ol className="mt-3 space-y-2">
                {trip.events!.map((event) => (
                  <li key={event.id} className="flex gap-3 text-xs">
                    {/* Local time: legitimately differs from the server's UTC render. */}
                    <span
                      suppressHydrationWarning
                      className="w-24 shrink-0 text-muted-foreground"
                    >
                      {formatTimestampIn(settings.timezone, event.created_at)}
                    </span>
                    <span>
                      <span className="font-medium">
                        {event.person_name ?? "System"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {event.action.replace(/_/g, " ")}
                        {event.note ? ` — ${event.note}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </CardContent>
        </Card>
      )}

      <ReportItemDialog
        tripId={trip.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />

      <Dialog open={sendBackOpen} onOpenChange={setSendBackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send back to the store</DialogTitle>
            <DialogDescription>
              Say what needs changing — the store manager sees this.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. We don't need the prawns this week, and add more rice."
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendBackOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !note.trim()}
              onClick={() => void runAction("send_back", note)}
            >
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The list grouped under category filter chips, so nobody scrolls through 65
 * cards. Each chip shows how many lines it holds; "All" restores the full
 * list. With no filter, items are still rendered as collapsible per-category
 * sections so the page starts short. (CATEGORY_ORDER lives in lib/types.)
 *
 * When `groupByStore` is set, the same chips/sections group by shop instead
 * (COSTCO, ALDI, VEGE...) so the Wednesday run can be walked store by store.
 */
function CategoryGroupedItems({
  items,
  person,
  tripStatus,
  onChanged,
  filter,
  onFilterChange,
  groupByStore,
  onGroupByStoreChange,
}: {
  items: TripItem[];
  person: SafePerson;
  tripStatus: TripStatus;
  onChanged: () => void;
  filter: string | null;
  onFilterChange: (next: string | null) => void;
  groupByStore: boolean;
  onGroupByStoreChange: (next: boolean) => void;
}) {
  const groups = new Map<string, TripItem[]>();
  for (const item of items) {
    const key = groupByStore
      ? item.store || "No store set"
      : item.category || "Misc";
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

  if (filter && groups.has(filter)) {
    return (
      <div className="space-y-2">
        <CategoryChips
          groups={groups}
          sortedKeys={sortedKeys}
          filter={filter}
          onFilterChange={onFilterChange}
          groupByStore={groupByStore}
          onGroupByStoreChange={onGroupByStoreChange}
        />
        {groups.get(filter)!.map((item) => (
          <TripItemRow
            key={item.id}
            item={item}
            person={person}
            tripStatus={tripStatus}
            onChanged={onChanged}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <CategoryChips
        groups={groups}
        sortedKeys={sortedKeys}
        filter={filter}
        onFilterChange={onFilterChange}
        groupByStore={groupByStore}
        onGroupByStoreChange={onGroupByStoreChange}
      />
      {sortedKeys.map((key, i) => (
        <details key={key} open={i === 0} className="group/cat">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border bg-card px-3 py-3 transition-colors hover:bg-muted/70">
            {groupByStore ? (
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CategoryIcon category={key} className="h-4 w-4 text-muted-foreground" />
            )}
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
              <TripItemRow
                key={item.id}
                item={item}
                person={person}
                tripStatus={tripStatus}
                onChanged={onChanged}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function CategoryChips({
  groups,
  sortedKeys,
  filter,
  onFilterChange,
  groupByStore,
  onGroupByStoreChange,
}: {
  groups: Map<string, TripItem[]>;
  sortedKeys: string[];
  filter: string | null;
  onFilterChange: (next: string | null) => void;
  groupByStore: boolean;
  onGroupByStoreChange: (next: boolean) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => onGroupByStoreChange(!groupByStore)}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium",
          groupByStore
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-card text-muted-foreground",
        )}
      >
        <StoreIcon className="h-3.5 w-3.5" />
        By store
      </button>
      <span className="mx-0.5 w-px shrink-0 self-stretch bg-border" aria-hidden />
      <button
        type="button"
        onClick={() => onFilterChange(null)}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium",
          filter === null
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-card text-muted-foreground",
        )}
      >
        All
        <span className="ml-1 opacity-70">
          {sortedKeys.reduce((n, k) => n + groups.get(k)!.length, 0)}
        </span>
      </button>
      {sortedKeys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onFilterChange(filter === key ? null : key)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium",
            filter === key
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground",
          )}
        >
          {!groupByStore && (
            <CategoryIcon
              category={key}
              className={cn(
                "h-3.5 w-3.5",
                filter === key ? "text-current" : "text-muted-foreground",
              )}
            />
          )}
          {key}
          <span className="ml-1 opacity-70">{groups.get(key)!.length}</span>
        </button>
      ))}
    </div>
  );
}
