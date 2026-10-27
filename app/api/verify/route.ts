import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

/** Called by the browser after the user completes payment. Idempotent — safe even if the webhook arrived first. */
export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in again to confirm your payment." }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.orderId || !b?.paymentId) return Response.json({ error: "Invalid request." }, { status: 400 });
  await processPaidOrder(String(b.orderId), String(b.paymentId)); // idempotent — safe even if webhook already processed it
  return Response.json({ ok: true });
}

async function processPaidOrder(orderId: string, paymentId: string): Promise<void> {
  // DB safety: one row per order_id. A browser retry would not double-activate because of the unique constraint on order_id.
  const db = sql();
  const [{ claimed }] = await db`
    UPDATE payments SET status = 'paid', payment_id = ${paymentId}, paid_at = now()
    WHERE order_id = ${orderId} AND status <> 'paid' RETURNING true AS claimed`;
  if (!claimed) return; // a retry or webhook already did it
  const [user] = await db`SELECT user_id FROM payments WHERE order_id = ${orderId}`;
  const [end] = await db`SELECT CURRENT_TIMESTAMP + CASE WHEN period = 'yearly' THEN interval '365 days' ELSE interval '30 days' END AS end_at
    FROM payments WHERE order_id = ${orderId} LIMIT 1`;
  await db`
    INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at)
    VALUES (${user.user_id}, 'pro', 'active', now(), ${end.end_at})
    ON CONFLICT (user_id, plan, status) DO UPDATE SET ends_at = GREATEST(now(), subscriptions.ends_at)`;
}
