import { redirect } from "next/navigation";
import { PeopleManager } from "@/components/people/PeopleManager";
import { PageHeader } from "@/components/shell/PageHeader";
import { getDb } from "@/lib/d1-context";
import { requirePagePerson } from "@/lib/page-data";
import { listPeople } from "@/lib/people";

export default async function PeoplePage() {
  const person = await requirePagePerson();
  if (person.role !== "admin") redirect("/");

  const db = await getDb();
  const people = await listPeople(db, true);

  return (
    <div>
      <PageHeader
        title="People"
        subtitle="Who can sign in, and what they are allowed to do."
      />
      <PeopleManager people={people} />
    </div>
  );
}
