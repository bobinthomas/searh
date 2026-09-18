import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusPill } from "@/components/trip/StatusPill";
import { getDb } from "@/lib/d1-context";
import { requirePagePerson } from "@/lib/page-data";
import { listTrips } from "@/lib/trips";
import { formatDayDate } from "@/lib/dates";
import type { MarketTrip } from "@/lib/types";

export default async function TripsPage() {
  const person = await requirePagePerson();
  const db = await getDb();
  const trips = await listTrips(db, 30);

  // Whatever this role can act on floats to the top.
  const needsAction = (t: MarketTrip) => {
    if (person.role === "admin") return t.status === "pending_approval";
    if (person.role === "store")
      return ["collecting", "reviewing", "approved", "purchasing"].includes(t.status);
    return t.status === "purchased";
  };

  const todo = trips.filter(needsAction);
  const rest = trips.filter((t) => !needsAction(t));

  const title = person.role === "admin" ? "Lists" : "Trips to market";

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={
          person.role === "admin"
            ? "Lists waiting for your approval appear first."
            : "Every trip to market, newest first."
        }
      />

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No trips yet. One is created automatically for your next market day.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {todo.length > 0 && (
            <Section title="Needs you" trips={todo} highlight />
          )}
          {rest.length > 0 && (
            <Section
              title={todo.length > 0 ? "Everything else" : "All trips"}
              trips={rest}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  trips,
  highlight,
}: {
  title: string;
  trips: MarketTrip[];
  highlight?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {trips.map((trip) => (
        <Link
          key={trip.id}
          href={`/trips/${trip.id}`}
          className={
            highlight
              ? "block rounded-xl border border-amber-500/50 bg-amber-500/5 p-4 transition-colors hover:bg-amber-500/10"
              : "block rounded-xl border bg-card p-4 transition-colors hover:bg-muted"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {formatDayDate(trip.trip_date)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {trip.item_count ?? 0} item
                {(trip.item_count ?? 0) === 1 ? "" : "s"}
                {trip.approved_by_name && ` · approved by ${trip.approved_by_name}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusPill status={trip.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
