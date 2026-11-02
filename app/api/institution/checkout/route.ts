import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { requireStaff } from "@/lib/inst-server";
import { getInstitutePlan, type InstitutePlanId } from "@/lib/pricing";
import { createPaymentOrder } from "@/lib/cashfree";

export const dynamic = "force-dynamic";

function siteOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_URL?.trim();
  return configured ? new URL(configured).origin : new URL(req.url).origin;
}

/** Create a pending Cashfree order for the approved institute owner. */
export async function POST(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  if (c.m.role !== "owner") return Response.json({ error: "Only the institute owner can manage billing." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const planId = String(body?.planId ?? "") as InstitutePlanId;
  const interval = body?.interval === "annual" ? "annual" : "monthly";
  const phone = String(body?.customerPhone ?? "").replace(/\D/g, "");
  const plan = getInstitutePlan(planId);
  if (!plan || !["institute_basic", "institute_growth"].includes(planId)) return Response.json({ error: "Choose an available institute plan." }, { status: 400 });
  if (!/^\d{10}$/.test(phone)) return Response.json({ error: "Enter a valid 10-digit mobile number." }, { status: 422 });
  const amountPaise = interval === "annual" ? plan.annualAmountPaise : plan.monthlyAmountPaise;
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) return Response.json({ error: "This plan is not configured for checkout." }, { status: 400 });

  try {
    const db = sql();
    const [owner] = await db`SELECT u.id, u.email, u.name, i.name AS institute_name
      FROM institutions i JOIN users u ON u.id = i.owner_id
      WHERE i.id = ${c.m.institution_id} AND i.status = 'approved' LIMIT 1`;
    if (!owner?.email) return Response.json({ error: "Institute owner account was not found." }, { status: 404 });
    const [catalog] = await db`INSERT INTO institute_plans (plan_id, monthly_amount_paise, annual_amount_paise, max_student_seats, is_active)
      VALUES (${planId}, ${plan.monthlyAmountPaise}, ${plan.annualAmountPaise}, ${plan.maxStudentSeats}, true)
      ON CONFLICT (plan_id) DO UPDATE SET monthly_amount_paise = EXCLUDED.monthly_amount_paise,
        annual_amount_paise = EXCLUDED.annual_amount_paise, max_student_seats = EXCLUDED.max_student_seats, is_active = true
      RETURNING id`;
    const orderId = `tszi_${c.m.institution_id.replace(/-/g, "").slice(0, 8)}_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const idempotencyKey = randomUUID();
    await db`INSERT INTO payments (user_id, institute_id, order_id, amount_paise, currency, status, provider, plan_id, idempotency_key, customer_email, created_at, updated_at)
      VALUES (${owner.id}, ${c.m.institution_id}, ${orderId}, ${amountPaise}, 'INR', 'pending', 'cashfree', ${planId}, ${idempotencyKey}, ${String(owner.email).toLowerCase()}, now(), now())`;
    try {
      const origin = siteOrigin(req);
      const order = await createPaymentOrder({
        orderId, amountPaise, idempotencyKey, customerId: String(owner.id),
        customerName: String(owner.name ?? owner.institute_name ?? "Institute owner"),
        customerEmail: String(owner.email).toLowerCase(), customerPhone: phone,
        planId: `${planId}_${interval}`,
        returnUrl: `${origin}/institution?order_id={order_id}`,
        notifyUrl: `${origin}/api/webhook`,
      });
      await db`UPDATE payments SET payment_session_id = ${order.paymentSessionId}, updated_at = now()
        WHERE order_id = ${orderId} AND institute_id = ${c.m.institution_id} AND status = 'pending'`;
      return Response.json({ orderId, paymentSessionId: order.paymentSessionId, amountPaise, mode: order.mode }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      await db`UPDATE payments SET status = 'failed', failure_reason = ${error instanceof Error ? error.message.slice(0, 250) : "Cashfree order creation failed"}, updated_at = now() WHERE order_id = ${orderId} AND status = 'pending'`;
      throw error;
    }
  } catch (error) {
    console.error("Institute checkout failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: error instanceof Error && /not configured|mobile number|Cashfree could not create/.test(error.message) ? error.message : "Could not start institute checkout. Check payment configuration and try again." }, { status: 502 });
  }
}
