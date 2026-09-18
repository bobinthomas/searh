import { AccountScreen } from "@/components/shell/AccountScreen";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePagePerson } from "@/lib/page-data";

export default async function AccountPage() {
  const person = await requirePagePerson();

  return (
    <div>
      <PageHeader title="You" subtitle="Your details and sign-in PIN." />
      <AccountScreen person={person} />
    </div>
  );
}
