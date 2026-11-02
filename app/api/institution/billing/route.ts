import { sql } from "@/lib/db";
import { requireStaff } from "@/lib/inst-server";
import { INSTITUTE_PLANS } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id")?.trim();
  const db = sql();
  const [subscription] = await db`
    SELECT ip.plan_id, ip.max_student_seats, s.status, s.started_at, s.ends_at,
      (s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > now())) AS is_active,
      (SELECT count(*)::int FROM institution_members im WHERE im.institution_id = s.institute_id AND im.role = 'student') AS students
    FROM institute_subscriptions s JOIN institute_plans ip ON ip.id = s.plan_id
    WHERE s.institute_id = ${c.m.institution_id}
    ORDER BY s.started_at DESC LIMIT 1
  `;
  let payment = null;
  if (orderId && orderId.length <= 128) {
    const [row] = await db`SELECT order_id, status, plan_id, amount_paise, currency, paid_at
      FROM payments WHERE order_id = ${orderId} AND institute_id = ${c.m.institution_id}
        AND user_id = ${c.uid} AND provider = 'cashfree' LIMIT 1`;
    if (row) payment = { orderId: row.order_id, status: row.status, planId: row.plan_id,
      amountPaise: Number(row.amount_paise), currency: row.currency,
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null };
  }
  return Response.json({ subscription: subscription ?? null, plans: Object.values(INSTITUTE_PLANS), payment },
    { headers: { "cache-control": "private, no-store", vary: "Cookie" } });
}
