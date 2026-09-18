"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/trip/StatusPill";
import { ReportItemDialog } from "@/components/trip/ReportItemDialog";
import { LowStockAlert } from "@/components/market/LowStockAlert";
import { SpendDelta } from "@/components/market/SpendDelta";
import { formatDayDate } from "@/lib/dates";
import { ROLE_LABELS, type MarketTrip, type SafePerson } from "@/lib/types";

export function HomeScreen({
  person,
  trip,
  needsSchedule,
  pendingApprovals,
}: {
  person: SafePerson;
  trip: MarketTrip | null;
  needsSchedule: boolean;
  pendingApprovals: MarketTrip[];
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [spend, setSpend] = useState<{ this_week: number; last_week: number } | null>(
    null,
  );

  // Admin-only: week-over-week spend delta on the home screen.
  useEffect(() => {
    if (person.role !== "admin") return;
    let active = true;
    fetch("/api/analytics/spend-delta")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setSpend(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [person.role]);

  const live = (trip?.items ?? []).filter((i) => i.status !== "dropped");
  const myRequests = live.filter((i) => i.requested_by === person.id);
  const awaitingMyApproval = pendingApprovals.length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[person.role]}
        </p>
        <h1 className="text-xl font-bold tracking-tight">
          Hello, {person.name.split(" ")[0]}
        </h1>
      </div>

      {/* Admin: what is waiting on you */}
      {person.role === "admin" && awaitingMyApproval > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="flex items-center gap-3 pt-5">
            <BellRing className="h-6 w-6 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {awaitingMyApproval} list
                {awaitingMyApproval === 1 ? "" : "s"} waiting for approval
              </p>
              <p className="text-xs text-muted-foreground">
                The store manager cannot buy until you approve.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/trips">Review</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Admin: spend trend at a glance */}
      {person.role === "admin" && spend && (
        <SpendDelta thisWeek={spend.this_week} lastWeek={spend.last_week} />
      )}

      {/* No schedule yet */}
      {needsSchedule && (
        <Card className="border-amber-500/50">
          <CardContent className="flex items-start gap-3 pt-5">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">No market days set up</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {person.role === "kitchen"
                  ? "Ask the store manager to add your market days before raising requests."
                  : "Add your market days to start a shopping list."}
              </p>
              {(person.role === "store" || person.role === "admin") && (
                <Button size="sm" className="mt-3" asChild>
                  <Link href="/schedule">Set market days</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* The current list */}
      {trip && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Next trip to market
                </p>
                <p className="text-base font-semibold">
                  {formatDayDate(trip.trip_date)}
                </p>
              </div>
              <StatusPill status={trip.status} />
            </div>

            <p className="text-sm text-muted-foreground">
              {live.length} item{live.length === 1 ? "" : "s"} on the list
              {person.role === "kitchen" && myRequests.length > 0 && (
                <> · {myRequests.length} from you</>
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="flex-1">
                <Link href={`/trips/${trip.id}`}>
                  Open list
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>

              {/* Kitchen reports straight from home */}
              {person.role === "kitchen" &&
                ["collecting", "reviewing"].includes(trip.status) && (
                  <Button
                    variant="outline"
                    onClick={() => setReportOpen(true)}
                    className="flex-1"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Report shortage
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kitchen: quick look at their own requests */}
      {person.role === "kitchen" && myRequests.length > 0 && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-sm font-semibold">Your requests</p>
            {myRequests.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
              >
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.approved_qty ?? item.requested_qty} {item.unit}
                  {item.status === "dropped" && " · dropped"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Store: stock health */}
      {person.role === "store" && <LowStockAlert />}

      {/* Admin shortcuts */}
      {person.role === "admin" && (
        <div className="grid grid-cols-2 gap-3">
          <ShortcutCard href="/people" icon={Users} label="People" hint="Add staff, reset PINs" />
          <ShortcutCard href="/inventory" icon={Package} label="Stock" hint="Items and levels" />
          <ShortcutCard href="/trips" icon={ClipboardCheck} label="All lists" hint="Approvals and history" />
          <ShortcutCard href="/history" icon={CheckCircle2} label="Spending" hint="What was bought" />
        </div>
      )}

      {/* Store shortcuts */}
      {person.role === "store" && (
        <div className="grid grid-cols-2 gap-3">
          <ShortcutCard href="/schedule" icon={CalendarDays} label="Market days" hint="Which days you shop" />
          <ShortcutCard href="/inventory" icon={Package} label="Stock" hint="Items and levels" />
        </div>
      )}

      {/* Kitchen: a nudge when a delivery needs confirming */}
      {person.role === "kitchen" && trip?.status === "purchased" && (
        <Card className="border-emerald-500/50">
          <CardContent className="flex items-start gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold">Shopping is done</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirm what actually arrived so short deliveries get noticed.
              </p>
              <Button size="sm" className="mt-3" asChild>
                <Link href={`/trips/${trip.id}`}>Confirm delivery</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {trip && (
        <ReportItemDialog
          tripId={trip.id}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}
    </div>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof Package;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted"
    >
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}
