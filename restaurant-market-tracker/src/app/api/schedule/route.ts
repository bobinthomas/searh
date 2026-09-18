// API: the weekly market schedule.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson, requireRole } from "@/lib/auth";
import {
  getAllMarketDays,
  createMarketDay,
  getMarketItemsByDay,
} from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function GET() {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const days = await getAllMarketDays(db);

    const daysWithItems = await Promise.all(
      days.map(async (day) => ({
        ...day,
        items: await getMarketItemsByDay(db, day.id),
      })),
    );

    return NextResponse.json(daysWithItems);
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["store", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const db = await getDb();
  const body = await request.json();
  const { day_of_week } = body;

  if (day_of_week === undefined || day_of_week < 0 || day_of_week > 6) {
    return NextResponse.json(
      { error: "day_of_week (0-6) is required" },
      { status: 400 },
    );
  }

  const id = await createMarketDay(db, day_of_week);
  return NextResponse.json({ id, success: true }, { status: 201 });
}
