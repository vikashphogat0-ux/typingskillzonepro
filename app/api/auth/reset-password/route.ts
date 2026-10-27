import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const newPassword = String(body?.newPassword ?? "");

  if (!token)
    return Response.json({ error: "Reset token is missing." }, { status: 400 });
  if (newPassword.length < 8)
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const db = sql();
  const [row] = await db`
    SELECT id, user_id FROM reset_tokens
    WHERE token = ${token}
      AND expires_at > now()
      AND used = false
  `;

  if (!row)
    return Response.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  // Mark used and update password atomically
  const [{ hash }] = await db`SELECT crypt(${newPassword}, gen_salt('bf', 10)) AS hash`;
  await db`UPDATE reset_tokens SET used = true WHERE id = ${row.id}`;
  await db`UPDATE users SET password_hash = ${hash} WHERE id = ${row.user_id}`;
  // Invalidate all existing sessions for security
  await db`DELETE FROM sessions WHERE user_id = ${row.user_id}`;

  return Response.json({ ok: true });
}
