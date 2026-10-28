import { sql } from "@/lib/db";

const authBaseUrl = () => {
  const value = process.env.NEON_AUTH_BASE_URL?.trim();
  if (!value) throw new Error("NEON_AUTH_BASE_URL is not configured");
  return value.replace(/\/+$/, "");
};

export type NeonIdentity = { id: string; email: string; name: string | null };

export async function getNeonIdentity(req: Request): Promise<NeonIdentity | null> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const response = await fetch(`${authBaseUrl()}/get-session`, {
    method: "GET",
    headers: { cookie, accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const user = payload?.user ?? payload?.data?.user ?? payload?.session?.user;
  if (!user?.id || !user?.email) return null;
  return { id: String(user.id), email: String(user.email).trim().toLowerCase(), name: user.name ? String(user.name) : null };
}

/** Link a fresh Neon Auth identity to the app's existing UUID user record.
 * Old sessions/passwords are not accepted; the migration resets old roles.
 * Existing result, subscription, and institute data are not dropped.
 */
export async function getOrCreateAppUser(identity: NeonIdentity): Promise<string> {
  const db = sql();
  const [linked] = await db`SELECT id FROM users WHERE neon_auth_user_id = ${identity.id} LIMIT 1`;
  if (linked) return String(linked.id);

  const [byEmail] = await db`SELECT id FROM users WHERE lower(email) = ${identity.email} LIMIT 1`;
  if (byEmail) {
    await db`UPDATE users SET neon_auth_user_id = ${identity.id}, role = 'student', name = COALESCE(NULLIF(${identity.name ?? ""}, ''), name) WHERE id = ${byEmail.id}`;
    return String(byEmail.id);
  }

  const [created] = await db`
    INSERT INTO users (email, name, role, neon_auth_user_id)
    VALUES (${identity.email}, ${identity.name}, 'student', ${identity.id})
    RETURNING id
  `;
  return String(created.id);
}

export function neonAuthUrl(): string {
  const value = process.env.NEON_AUTH_BASE_URL?.trim();
  if (!value) throw new Error("NEON_AUTH_BASE_URL is not configured");
  return value.replace(/\/+$/, "");
}
