import { cn } from "@/lib/utils";
import { TRIP_STATUS_LABELS, type TripItemSource, type TripStatus } from "@/lib/types";

const STATUS_STYLES: Record<TripStatus, string> = {
  collecting: "bg-muted text-foreground",
  reviewing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  pending_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  purchasing: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  purchased: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  received: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
};

export function StatusPill({
  status,
  className,
}: {
  status: TripStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}

const SOURCE_STYLES: Record<TripItemSource, string> = {
  kitchen_ran_out: "border-rose-500/40 text-rose-600 dark:text-rose-400",
  kitchen_extra: "border-rose-500/40 text-rose-600 dark:text-rose-400",
  store_added: "border-blue-500/40 text-blue-600 dark:text-blue-400",
  auto_low_stock: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  auto_schedule: "border-muted-foreground/30 text-muted-foreground",
};

export function SourceTag({ source }: { source: TripItemSource }) {
  const labels: Record<TripItemSource, string> = {
    kitchen_ran_out: "Ran out",
    kitchen_extra: "Extra need",
    store_added: "Store",
    auto_low_stock: "Low stock",
    auto_schedule: "Scheduled",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        SOURCE_STYLES[source],
      )}
    >
      {labels[source]}
    </span>
  );
}
