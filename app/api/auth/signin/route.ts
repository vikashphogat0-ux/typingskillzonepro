import { sql } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password)
    return Response.json({ error: "Email and password are required." }, { status: 400 });

  const db = sql();
  // verify password with pgcrypto crypt — returns the stored hash if match, empty string if not
  const [user] = await db`
    SELECT id, name, email
    FROM users
    WHERE lower(email) = ${email}
      AND password_hash IS NOT NULL
      AND password_hash = crypt(${password}, password_hash)
  `;

  if (!user)
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });

  const cookie = await createSession(user.id);
  return Response.json({ ok: true, name: user.name, email: user.email }, {
    headers: { "Set-Cookie": cookie },
  });
}
