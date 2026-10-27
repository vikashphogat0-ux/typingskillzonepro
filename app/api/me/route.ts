import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in required." }, { status: 401 });
  const db = sql();
  const [user] = await db`SELECT id, name, email, created_at FROM users WHERE id = ${uid}`;
  if (!user) return Response.json({ error: "User not found." }, { status: 404 });
  return Response.json(user);
}

export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (name.length < 1 || name.length > 100)
    return Response.json({ error: "Name must be 1–100 characters." }, { status: 400 });
  await sql()`UPDATE users SET name = ${name} WHERE id = ${uid}`;
  return Response.json({ ok: true });
}
