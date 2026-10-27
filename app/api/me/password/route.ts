import { getUserId } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const oldPassword = String(body?.oldPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (!oldPassword) return Response.json({ error: "Current password is required." }, { status: 400 });
  if (newPassword.length < 8) return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });

  const db = sql();
  const [user] = await db`
    SELECT id FROM users
    WHERE id = ${uid}
      AND password_hash IS NOT NULL
      AND password_hash = crypt(${oldPassword}, password_hash)
  `;
  if (!user) return Response.json({ error: "Current password is incorrect." }, { status: 401 });

  const [{ hash }] = await db`SELECT crypt(${newPassword}, gen_salt('bf', 10)) AS hash`;
  await db`UPDATE users SET password_hash = ${hash} WHERE id = ${uid}`;

  return Response.json({ ok: true });
}
