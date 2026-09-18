import { SpendCharts } from "@/components/market/SpendCharts";
import { SpendSummary } from "@/components/market/SpendSummary";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePagePerson } from "@/lib/page-data";

export default async function HistoryPage() {
  const person = await requirePagePerson();

  return (
    <div>
      <PageHeader
        title="Spending"
        subtitle="Everything that has been bought, and what it cost."
      />
      <SpendCharts />
      <div className="mt-4">
        <SpendSummary canEdit={person.role !== "kitchen"} />
      </div>
    </div>
  );
}
