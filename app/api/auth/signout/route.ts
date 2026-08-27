import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_auth");
  return NextResponse.redirect(new URL("/login", process.env.SITE_URL ?? "http://localhost:3000"));
}
