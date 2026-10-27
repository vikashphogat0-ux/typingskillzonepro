import { verifyWebhookSignature } from "@/lib/cashfree";
import { processPaidOrder } from "@/lib/subscription";
import { type StudentPlanId } from "@/lib/pricing";

/** Cashfree Payment Engine webhook. The server handles webhook signature verification and re-processes the event safely. */
export async function POST(req: Request) {
  const raw = await req.text();
  const sigHeader = req.headers.get("x-cashfree-signature") ?? "";
  const ts = req.headers.get("x-cashfree-timestamp") ?? "";
  const secret = process.env.CF_WEBHOOK_SECRET;
  if (!secret || !verifyWebhookSignature(raw, ts, sigHeader, secret)) return new Response("bad signature", { status: 400 });
  let e: any;
  try { e = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  if (e.event === "charge" || e.event === "payment.success") {
    const orderId = e.data?.order?.id;
    const paymentId = e.data?.payment?.id;
    
    // Extract plan_id from the order tags we passed during order creation
    const planId = e.data?.order?.order_tags?.plan_id as StudentPlanId;

    if (orderId && paymentId && planId) {
      await processPaidOrder(orderId, paymentId, planId);
    }
  }
  return new Response("ok"); // always 200 so Cashfree stops retrying
}