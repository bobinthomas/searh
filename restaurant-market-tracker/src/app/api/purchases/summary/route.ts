// API: spend grouped by item over a date range.

import { NextRequest, NextResponse } from "next/server";
import { requirePerson } from "@/lib/auth";
import { getSpendSummary } from "@/lib/db";
import { getDb } from "@/lib/d1-context";

export async function GET(request: NextRequest) {
  const auth = await requirePerson();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || new Date(0).toISOString();
    const to = searchParams.get("to") || new Date().toISOString();

    return NextResponse.json(await getSpendSummary(db, from, to));
  } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
}
