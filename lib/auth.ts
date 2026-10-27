import { sql } from "./db";
import { getSessionUserId } from "./session";

export interface Identity { uid: string }

/** The signed-in user's id from the session cookie, or null. */
export async function getIdentity(req: Request): Promise<Identity | null> {
  const cookie = req.headers.get("cookie");
  const uid = await getSessionUserId(cookie);
  if (!uid) return null;
  return { uid };
}

export async function getUserId(req: Request): Promise<string | null> {
  return (await getIdentity(req))?.uid ?? null;
}

/** Admin only: role must be 'admin'. */
export async function requireAdmin(req: Request): Promise<string | null> {
  const id = await getIdentity(req);
  if (!id) return null;
  const [row] = await sql()`SELECT role FROM users WHERE id = ${id.uid}`;
  return row?.role === "admin" ? id.uid : null;
}
