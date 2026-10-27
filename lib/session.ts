/**
 * Session management — no external auth library.
 * Sessions are random 32-byte hex tokens stored in the `sessions` table in Neon.
 * The token is set as an httpOnly, SameSite=Lax cookie named `tsz_session`.
 */
import { sql } from "./db";

export const COOKIE = "tsz_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

/** Create a new session for a user and return the Set-Cookie header value. */
export async function createSession(userId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + MAX_AGE_SEC * 1000).toISOString();
  await sql()`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt})`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SEC}${secure}`;
}

/** Resolve a session cookie string to a user id, or null if missing/expired. */
export async function getSessionUserId(cookieHeader: string | null): Promise<string | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`));
  if (!match) return null;
  const token = match[1];
  const db = sql();
  const [row] = await db`
    SELECT user_id FROM sessions
    WHERE token = ${token} AND expires_at > now()
  `;
  return row?.user_id ?? null;
}

/** Return a Set-Cookie header that clears the session cookie. */
export function clearSessionCookie(): string {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Delete a specific session token from the database. */
export async function deleteSession(cookieHeader: string | null): Promise<void> {
  if (!cookieHeader) return;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`));
  if (!match) return;
  await sql()`DELETE FROM sessions WHERE token = ${match[1]}`;
}
