import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentPlan, type StudentPlanId } from "@/lib/pricing";
import { cashfreeMode, createPaymentOrder } from "@/lib/cashfree";

export const dynamic = "force-dynamic";

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_URL || process.env.BETTER_AUTH_URL || "https://typingskillzone.in";
  return new URL(raw).origin;
}

/** Create a pending server-side payment record and a Cashfree PG order. */
export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to upgrade." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const planId = body?.planId as StudentPlanId | undefined;
  const customerPhone = String(body?.customerPhone ?? "").replace(/\D/g, "");
  const plan = planId ? getStudentPlan(planId) : null;

  if (!planId || !plan || plan.id === "free" || !plan.durationDays || plan.amountPaise <= 0) {
    return Response.json({ error: "Choose a valid paid plan." }, { status: 400 });
  }
  if (!/^\d{10}$/.test(customerPhone)) {
    return Response.json({ error: "Enter a valid 10-digit mobile number." }, { status: 422 });
  }

  try {
    const db = sql();
    const [user] = await db`SELECT id, email, name FROM users WHERE id = ${uid} LIMIT 1`;
    if (!user?.email) return Response.json({ error: "Your account email could not be found." }, { status: 404 });

    const orderId = `tsz_${String(uid).replace(/-/g, "").slice(0, 8)}_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const idempotencyKey = randomUUID();
    const origin = siteOrigin();

    // Persist the expected user, plan and amount before creating the external order.
    await db`
      INSERT INTO payments (
        user_id, order_id, payment_id, amount_paise, currency, status,
        provider, plan_id, idempotency_key, customer_email, created_at, updated_at
      )
      VALUES (
        ${uid}, ${orderId}, NULL, ${plan.amountPaise}, 'INR', 'pending',
        'cashfree', ${plan.id}, ${idempotencyKey}, ${String(user.email).toLowerCase()}, now(), now()
      )
    `;

    try {
      const order = await createPaymentOrder({
        orderId,
        amountPaise: plan.amountPaise,
        idempotencyKey,
        customerId: String(uid),
        customerName: String(user.name ?? "Typing Skill Zone user"),
        customerEmail: String(user.email).toLowerCase(),
        customerPhone,
        planId: plan.id,
        returnUrl: `${origin}/pricing?order_id={order_id}`,
        notifyUrl: `${origin}/api/webhook`,
      });

      await db`
        UPDATE payments
        SET payment_session_id = ${order.paymentSessionId}, updated_at = now()
        WHERE order_id = ${orderId} AND user_id = ${uid} AND status = 'pending'
      `;

      return Response.json({
        orderId: order.orderId,
        paymentSessionId: order.paymentSessionId,
        amountPaise: order.amountPaise,
        mode: order.mode,
      }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      await db`
        UPDATE payments
        SET status = 'failed', failure_reason = ${error instanceof Error ? error.message.slice(0, 250) : "Cashfree order creation failed"}, updated_at = now()
        WHERE order_id = ${orderId} AND status = 'pending'
      `;
      throw error;
    }
  } catch (error) {
    console.error("Cashfree checkout creation failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({
      error: error instanceof Error && /not configured|mobile number|Cashfree could not create/.test(error.message)
        ? error.message
        : "Could not start Cashfree checkout. Check the payment configuration and try again.",
    }, { status: 502 });
  }
}
