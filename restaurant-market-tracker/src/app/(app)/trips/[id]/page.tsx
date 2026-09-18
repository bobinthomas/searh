import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TripScreen } from "@/components/trip/TripScreen";
import { getDb } from "@/lib/d1-context";
import { requirePagePerson } from "@/lib/page-data";
import { getTrip } from "@/lib/trips";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const person = await requirePagePerson();
  const { id } = await params;

  const db = await getDb();
  const trip = await getTrip(db, id);
  if (!trip) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/trips"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All trips
      </Link>
      <TripScreen trip={trip} person={person} />
    </div>
  );
}
