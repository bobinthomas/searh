import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { getCurrentPerson } from "@/lib/auth";

export default async function SettingsPage() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");
  if (person.role !== "admin") redirect("/");

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Company details, currency, timezone and workflow rules."
      />
      <SettingsScreen />
    </div>
  );
}
