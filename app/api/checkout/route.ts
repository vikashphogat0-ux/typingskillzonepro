import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import {
  validateAmount,
  toPaise,
  getStudentPlan,
  type StudentPlanId,
} from "@/lib/pricing";
import { createPaymentOrder } from "@/lib/cashfree";

/** Starts a Cashfree payment order. Returns the order id, amount, and merchant credentials so the embedded JS checkout can open. */
export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to upgrade." }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.planId) return Response.json({ error: "Choose a plan." }, { status: 400 });
  try {
    const merchantId = process.env.CF_MERCHANT_ID;
    const plan = getStudentPlan(b.planId as StudentPlanId);
    if (!plan) return Response.json({ error: "Invalid plan." }, { status: 400 });
    const amount = plan.amountPaise;
    const idempotencyKey = `tsz_${uid}_${b.planId}_${Date.now()}`;
    const order = await createPaymentOrder(amount, merchantId ?? "", idempotencyKey, { user_id: uid, plan_id: b.planId }, "TypingSkillZone Pro");
    return Response.json({ orderId: order.id, amount, clientSecret: "", keySecret: process.env.CF_SECRET_KEY, mercId: merchantId });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Could not create the payment." }, { status: 502 });
  }
}
