import { InventoryTable } from "@/components/market/InventoryTable";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePagePerson } from "@/lib/page-data";

export default async function InventoryPage() {
  const person = await requirePagePerson();
  const canEdit = person.role !== "kitchen";

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle={
          canEdit
            ? "What you have, and the level that triggers a reorder."
            : "What is currently in the store — useful when reporting shortages."
        }
      />
      <InventoryTable canEdit={canEdit} />
    </div>
  );
}
