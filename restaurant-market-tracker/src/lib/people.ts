// People (staff) and their sign-in sessions.

import { d1All, d1First, d1Run, type D1Client } from "./db";
import type { Person, Role } from "./types";

const SESSION_DAYS = 30;

function newId(): string {
  return crypto.randomUUID();
}

// ─── PIN hashing ────────────────────────────────────────────
// A 4-digit PIN is low entropy by nature; salting prevents the hashes from
// being pre-computed, and rate limiting on login stops brute force.

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string, salt?: string): Promise<string> {
  const s = salt ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${s}:${await sha256Hex(`${s}:${pin}`)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const salt = stored.split(":")[0];
  if (!salt) return false;
  const candidate = await hashPin(pin, salt);
  // Lengths always match here, so a plain compare is enough.
  return candidate === stored;
}

// ─── People ─────────────────────────────────────────────────

export async function listPeople(
  db: D1Client,
  includeInactive = false,
): Promise<Person[]> {
  return d1All<Person>(
    db,
    `SELECT * FROM people
     ${includeInactive ? "" : "WHERE active = 1"}
     ORDER BY sort_order, name`,
  );
}

export async function getPerson(
  db: D1Client,
  id: string,
): Promise<Person | null> {
  return d1First<Person>(db, "SELECT * FROM people WHERE id = ?", id);
}

export async function createPerson(
  db: D1Client,
  input: { name: string; role: Role; pin: string; sort_order?: number },
): Promise<string> {
  const id = newId();
  await d1Run(
    db,
    `INSERT INTO people (id, name, role, pin_hash, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.role,
    await hashPin(input.pin),
    input.sort_order ?? 99,
  );
  return id;
}

export async function updatePerson(
  db: D1Client,
  id: string,
  fields: { name?: string; role?: Role; active?: number; sort_order?: number },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(value);
  }
  if (sets.length === 0) return;

  values.push(id);
  await d1Run(
    db,
    `UPDATE people SET ${sets.join(", ")}, updated_at = datetime('now')
     WHERE id = ?`,
    ...values,
  );
}

export async function setPersonPin(
  db: D1Client,
  id: string,
  pin: string,
): Promise<void> {
  await d1Run(
    db,
    `UPDATE people SET pin_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    await hashPin(pin),
    id,
  );
}

async function countActiveAdmins(db: D1Client): Promise<number> {
  const row = await d1First<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM people WHERE role = 'admin' AND active = 1",
  );
  return row?.n ?? 0;
}

/**
 * Guards against locking everyone out: refuses to remove the last active admin.
 */
export async function wouldRemoveLastAdmin(
  db: D1Client,
  id: string,
  next: { role?: Role; active?: number },
): Promise<boolean> {
  const person = await getPerson(db, id);
  if (!person || person.role !== "admin" || person.active !== 1) return false;

  const stillAdmin = (next.role ?? person.role) === "admin";
  const stillActive = (next.active ?? person.active) === 1;
  if (stillAdmin && stillActive) return false;

  return (await countActiveAdmins(db)) <= 1;
}

// ─── Login throttling ───────────────────────────────────────

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 5;

/** Returns the ISO time the person is locked until, or null if they may try. */
export async function loginLockedUntil(
  db: D1Client,
  personId: string,
): Promise<string | null> {
  const row = await d1First<{ locked_until: string | null }>(
    db,
    "SELECT locked_until FROM login_attempts WHERE person_id = ?",
    personId,
  );
  if (!row?.locked_until) return null;
  return row.locked_until > new Date().toISOString() ? row.locked_until : null;
}

export async function recordFailedLogin(
  db: D1Client,
  personId: string,
): Promise<void> {
  const row = await d1First<{ failed: number }>(
    db,
    "SELECT failed FROM login_attempts WHERE person_id = ?",
    personId,
  );
  const failed = (row?.failed ?? 0) + 1;

  if (failed >= MAX_FAILED_LOGINS) {
    const until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
    await d1Run(
      db,
      `INSERT INTO login_attempts (person_id, failed, locked_until)
       VALUES (?, 0, ?)
       ON CONFLICT(person_id) DO UPDATE SET failed = 0, locked_until = excluded.locked_until`,
      personId,
      until,
    );
    return;
  }

  await d1Run(
    db,
    `INSERT INTO login_attempts (person_id, failed) VALUES (?, ?)
     ON CONFLICT(person_id) DO UPDATE SET failed = excluded.failed`,
    personId,
    failed,
  );
}

export async function clearLoginAttempts(
  db: D1Client,
  personId: string,
): Promise<void> {
  await d1Run(db, "DELETE FROM login_attempts WHERE person_id = ?", personId);
}

// ─── Sessions ───────────────────────────────────────────────

export interface SessionInfo {
  token: string;
  expiresAt: string;
}

export async function createSession(
  db: D1Client,
  personId: string,
): Promise<SessionInfo> {
  const token = `${newId()}.${newId()}`;
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);

  await d1Run(
    db,
    "INSERT INTO sessions (token, person_id, expires_at) VALUES (?, ?, ?)",
    token,
    personId,
    expires.toISOString(),
  );

  return { token, expiresAt: expires.toISOString() };
}

export async function getSessionPerson(
  db: D1Client,
  token: string,
): Promise<Person | null> {
  return d1First<Person>(
    db,
    `SELECT p.* FROM sessions s
     JOIN people p ON p.id = s.person_id
     WHERE s.token = ? AND s.expires_at > ? AND p.active = 1`,
    token,
    new Date().toISOString(),
  );
}

export async function deleteSession(
  db: D1Client,
  token: string,
): Promise<void> {
  await d1Run(db, "DELETE FROM sessions WHERE token = ?", token);
}

export async function pruneSessions(db: D1Client): Promise<void> {
  await d1Run(
    db,
    "DELETE FROM sessions WHERE expires_at <= ?",
    new Date().toISOString(),
  );
}
