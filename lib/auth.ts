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
export async function requireAdmin(req: Request): Promise<string | null> {
  const id = await getIdentity(req);
  if (!id) return null;
  const [row] = await sql()`SELECT role FROM users WHERE id = ${id.uid}`;
  return row?.role === "admin" ? id.uid : null;
}
