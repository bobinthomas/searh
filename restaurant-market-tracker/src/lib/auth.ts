// Session handling and role guards.
//
// Every signed-in action records WHO did it, which the approval trail relies on.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "./d1-context";
import {
  createSession,
  deleteSession,
  getSessionPerson,
} from "./people";
import type { Person, Role } from "./types";

const COOKIE_NAME = "mt_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, in seconds

export async function startSession(personId: string): Promise<void> {
  const db = await getDb();
  const { token } = await createSession(db, personId);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const db = await getDb();
    await deleteSession(db, token);
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentPerson(): Promise<Person | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const db = await getDb();
  return getSessionPerson(db, token);
}

export type AuthResult = { person: Person } | NextResponse;

/**
 * Resolve the signed-in person and check their role.
 *
 * Returns either `{ person }` or a ready-to-return NextResponse, so routes read:
 *   const auth = await requireRole(["store", "admin"]);
 *   if (auth instanceof NextResponse) return auth;
 *   const { person } = auth;
 */
export async function requireRole(roles: Role[]): Promise<AuthResult> {
  const person = await getCurrentPerson();

  if (!person) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  if (!roles.includes(person.role)) {
    return NextResponse.json(
      { error: "Your role cannot do that" },
      { status: 403 },
    );
  }

  return { person };
}

/** Any signed-in person, regardless of role. */
export async function requirePerson(): Promise<AuthResult> {
  return requireRole(["kitchen", "store", "admin"]);
}
