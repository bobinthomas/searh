// Server-only helpers. Importing this from a client component would pull in
// the D1 binding, so keep page-level data loading in one place.
import { redirect } from "next/navigation";
import { getCurrentPerson } from "./auth";
import { getDb } from "./d1-context";
import { listTrips, getTrip, getOrCreateCurrentTrip, NoMarketDayError } from "./trips";
import { toSafePerson, type MarketTrip, type SafePerson } from "./types";

/** The signed-in person, or a redirect to sign-in. */
export async function requirePagePerson(): Promise<SafePerson> {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");
  return toSafePerson(person);
}

/** The person including secrets — for server-only checks. */
export async function requirePagePersonFull() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");
  return person;
}

export interface CurrentTripResult {
  trip: MarketTrip | null;
  /** True when no market days exist, so no list can be built yet. */
  needsSchedule: boolean;
}

export async function loadCurrentTrip(
  personId: string | null,
): Promise<CurrentTripResult> {
  const db = await getDb();
  try {
    const current = await getOrCreateCurrentTrip(db, personId);
    const trip = await getTrip(db, current.id);
    return { trip, needsSchedule: false };
  } catch (error) {
    if (error instanceof NoMarketDayError) {
      return { trip: null, needsSchedule: true };
    }
    throw error;
  }
}

/** Trips sitting with the admin, newest first. */
export async function loadPendingApprovals(): Promise<MarketTrip[]> {
  const db = await getDb();
  const trips = await listTrips(db, 30);
  return trips.filter((t) => t.status === "pending_approval");
}
