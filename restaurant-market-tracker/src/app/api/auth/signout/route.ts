// API: sign out.

import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

export async function POST() {
  await endSession();
  return NextResponse.json({ success: true });
}
