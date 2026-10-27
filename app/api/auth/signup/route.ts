import { sql } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim() || email.split("@")[0];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8)
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const db = sql();

  // check duplicate
  const [existing] = await db`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (existing)
    return Response.json({ error: "An account with this email already exists." }, { status: 409 });

  // hash password with pgcrypto (bcrypt, cost 10)
  const [{ hash }] = await db`SELECT crypt(${password}, gen_salt('bf', 10)) AS hash`;

  const [user] = await db`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, ${name}, ${hash})
    RETURNING id
  `;

  const cookie = await createSession(user.id);
  return Response.json({ ok: true }, {
    status: 201,
    headers: { "Set-Cookie": cookie },
  });
}
