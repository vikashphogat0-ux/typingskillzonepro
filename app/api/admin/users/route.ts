import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").trim();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await sql()`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
      (SELECT s.plan FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.ends_at > now() ORDER BY s.ends_at DESC LIMIT 1) AS plan,
      (SELECT count(*)::int FROM results r WHERE r.user_id = u.id) AS tests,
      (SELECT max(r.created_at) FROM results r WHERE r.user_id = u.id) AS last_test
    FROM users u
    WHERE ${q} = '' OR u.name ILIKE ${like} OR u.email ILIKE ${like}
    ORDER BY u.created_at DESC LIMIT 200`;
  return Response.json(rows);
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid user ID." }, { status: 400 });
  if (b?.role && ["student", "admin"].includes(b.role)) {
    await sql()`UPDATE users SET role = ${b.role} WHERE id = ${id}`;
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Invalid action." }, { status: 400 });
}
