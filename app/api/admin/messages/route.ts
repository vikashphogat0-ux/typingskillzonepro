import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const rows = await sql()`SELECT id, name, email, subject, message, status, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 200`;
  return Response.json(rows);
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  if (!["open", "resolved"].includes(b?.status)) return Response.json({ error: "Invalid status." }, { status: 400 });
  await sql()`UPDATE contact_messages SET status = ${b.status} WHERE id = ${id}`;
  return Response.json({ ok: true });
}
