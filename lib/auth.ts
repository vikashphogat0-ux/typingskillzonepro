import { sql } from "./db";
import { getNeonIdentity, getOrCreateAppUser } from "./neon-auth";

export interface Identity { uid: string }

export async function getIdentity(req: Request): Promise<Identity | null> {
  try {
    const identity = await getNeonIdentity(req);
    if (!identity) return null;
    return { uid: await getOrCreateAppUser(identity) };
  } catch (error) {
    console.error("Neon Auth session verification failed:", error);
    return null;
  }
}
export async function getUserId(req: Request): Promise<string | null> {
  return (await getIdentity(req))?.uid ?? null;
}

/**
 * Admin authorization is server-side only.
 * Existing users.role='admin' accounts remain supported. A separate, explicit
 * SUPER_ADMIN_EMAILS allowlist can bootstrap/retain owner access without a
 * destructive role/schema migration. The allowlist is a server environment
 * variable and must never be exposed to the client.
 */
export async function requireAdmin(req: Request): Promise<string | null> {
  const identity = await getIdentity(req);
  if (!identity) return null;
  const [row] = await sql()`SELECT email, role FROM users WHERE id = ${identity.uid} LIMIT 1`;
  if (!row) return null;

  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isAllowlistedSuperAdmin = allowlist.includes(String(row.email ?? "").trim().toLowerCase());

  return row.role === "admin" || isAllowlistedSuperAdmin ? identity.uid : null;
}
