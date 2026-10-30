import { verifyWebhookSignature, verifyCashfreePayment } from "@/lib/cashfree";
import { processPaidOrder } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/**
 * Cashfree PG webhook endpoint.
 * Configure this exact URL in Cashfree: https://typingskillzone.in/api/webhook
 * Verify the signature against the untouched raw body before parsing JSON.
 */
export async function GET() {
  // Safe reachability probe for Cashfree/dashboard troubleshooting; never exposes configuration or secrets.
  return Response.json({ ok: true, endpoint: "cashfree-pg-webhook" }, {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const secret = process.env.CF_SECRET_KEY?.trim();

  if (!secret || !verifyWebhookSignature(rawBody, timestamp, signature, secret)) {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const type = String(event?.type ?? "");
  // Other signed Cashfree event types are acknowledged but do not grant access.
  if (type !== "PAYMENT_SUCCESS_WEBHOOK") {
    return Response.json({ received: true, ignored: true });
  }

  const orderId = String(event?.data?.order?.order_id ?? "");
  const paymentId = String(event?.data?.payment?.cf_payment_id ?? "");
  const paymentStatus = String(event?.data?.payment?.payment_status ?? "");
  const currency = String(event?.data?.payment?.payment_currency ?? event?.data?.order?.order_currency ?? "");
  const amountRupees = Number(event?.data?.payment?.payment_amount);

  if (!orderId || !paymentId || paymentStatus !== "SUCCESS" ||
      !Number.isFinite(amountRupees) || amountRupees <= 0 || currency !== "INR") {
    return new Response("Invalid payment event", { status: 400 });
  }

  const amountPaise = Math.round(amountRupees * 100);
  try {
    const verified = await verifyCashfreePayment(orderId, paymentId, amountPaise, currency);
    if (!verified) {
      console.error("Cashfree webhook payment failed independent gateway verification", { orderId, paymentId });
      return new Response("Payment could not be independently verified", { status: 400 });
    }
    const accepted = await processPaidOrder(orderId, verified.paymentId, verified.amountPaise, verified.currency);
    if (!accepted) {
      // A mismatched/untracked payment must never grant subscription access.
      console.error("Cashfree webhook did not match a pending order", { orderId, paymentId });
      return new Response("Payment did not match a pending order", { status: 400 });
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Cashfree webhook processing failed:", error instanceof Error ? error.message : "unknown error");
    // 5xx lets Cashfree retry a transient database failure.
    return new Response("Webhook processing failed", { status: 500 });
  }
}
