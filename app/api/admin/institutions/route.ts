import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  return Response.json(await sql()`SELECT i.id, i.name, i.city, i.state, i.phone, i.contact_email, i.status, i.created_at, u.email AS owner_email,
    (SELECT count(*) FROM institution_members im WHERE im.institution_id = i.id AND im.role = 'student')::int AS students
    FROM institutions i JOIN users u ON u.id = i.owner_id ORDER BY (i.status = 'pending') DESC, i.created_at DESC LIMIT 200`);
}

/** { id, status: approved | suspended | pending } */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const b = await req.json().catch(() => null);
  if (!["approved", "suspended", "pending"].includes(b?.status) || !/^[0-9a-f-]{36}$/i.test(String(b?.id))) return Response.json({ error: "Invalid request." }, { status: 400 });
  await sql()`UPDATE institutions SET status = ${b.status} WHERE id = ${b.id}`;
  return Response.json({ ok: true });
}
