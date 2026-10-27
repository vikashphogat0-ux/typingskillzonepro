import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { grantPro, revokePro } from "@/lib/subscription";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  return Response.json(await sql()`SELECT u.email, s.status, s.ends_at, (s.status = 'active' AND s.ends_at > now()) AS is_pro
    FROM subscriptions s JOIN users u ON u.id = s.user_id WHERE s.plan = 'pro' ORDER BY s.ends_at DESC LIMIT 100`);
}

/** { email, days } grants or extends Pro. { email, revoke: true } ends it now. */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const [u] = await sql()`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (!u) return Response.json({ error: "No user with that email." }, { status: 404 });
  if (b.revoke) { await revokePro(u.id); return Response.json({ ok: true }); }
  const days = Number(b.days);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return Response.json({ error: "Days must be between 1 and 3650." }, { status: 400 });
  return Response.json({ ok: true, endsAt: await grantPro(u.id, days) });
}
