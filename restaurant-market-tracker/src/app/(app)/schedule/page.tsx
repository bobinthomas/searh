import { redirect } from "next/navigation";
import { DayScheduleManager } from "@/components/market/DayScheduleManager";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePagePerson } from "@/lib/page-data";

export default async function SchedulePage() {
  const person = await requirePagePerson();
  // Only the store manager and admin own the schedule.
  if (person.role === "kitchen") redirect("/");

  return (
    <div>
      <PageHeader
        title="Market days"
        subtitle="The days you shop. Each one becomes its own list, and off-day requests queue into the next trip."
      />
      <DayScheduleManager />
    </div>
  );
}
