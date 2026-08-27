import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Check that the admin_auth cookie is set.
 * Returns null if authenticated, or a 401 NextResponse to return early.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin_auth");

  if (!auth || auth.value !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // authenticated
}
