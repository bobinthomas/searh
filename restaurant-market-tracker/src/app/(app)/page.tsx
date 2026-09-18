import { HomeScreen } from "@/components/home/HomeScreen";
import {
  loadCurrentTrip,
  loadPendingApprovals,
  requirePagePerson,
} from "@/lib/page-data";

export default async function HomePage() {
  const person = await requirePagePerson();
  const { trip, needsSchedule } = await loadCurrentTrip(person.id);
  const pendingApprovals =
    person.role === "admin" ? await loadPendingApprovals() : [];

  return (
    <HomeScreen
      person={person}
      trip={trip}
      needsSchedule={needsSchedule}
      pendingApprovals={pendingApprovals}
    />
  );
}
