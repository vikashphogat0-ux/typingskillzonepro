import { createHmac } from "node:crypto";
import { Buffer } from "node:buffer";

const sig = (data: string, secret: string) => Buffer.from(createHmac("sha256", secret).update(data).digest()).toString("base64");

/** Verify a Cashfree v1 order signature: X-Cashfree-Signature = base64(HMAC_SHA256(secret, endpoint + "\n" + timestamp + "\n" + body)). */
export function verifyOrderSignature(orderId: string, paymentId: string, timestamp: string, signature: string, keySecret: string): boolean {
  const endpoint = "/order/v1/orders";
  const expected = sig(`${endpoint}\n${timestamp}\n${JSON.stringify({ order_id: orderId, entity_id: paymentId })}`, keySecret);
  return expected === String(signature);
}

/** Verify a Cashfree webhook: X-Cashfree-Signature = base64(HMAC_SHA256(webhookSecret, "".timestamp.rawBody)). */
export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string, webhookSecret: string): boolean {
  const expected = sig(`${timestamp}.${rawBody}`, webhookSecret);
  return expected === String(signature);
}

/** Create a Cashfree payment order via the v1 REST API. */
export async function createPaymentOrder(amountPaise: number, merchantId: string, idempotencyKey: string, notes: Record<string, string>, orderNote: string) {
  const secret = process.env.CF_SECRET_KEY;
  if (!secret || !merchantId) throw new Error("Cashfree keys are not configured");
  const ts = Date.now().toString();
  const res = await fetch("https://api2.cashfree.tech/order/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Cashfree-Signature": sig(`/order/v1/orders\n${ts}\n${JSON.stringify({ amount: amountPaise, currency: "INR", name: "TypingSkillZone", notes })}}`, secret),
      "X-Cashfree-Timestamp": ts,
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", name: "TypingSkillZone", notes }),
  });
  if (!res.ok) throw new Error(`Cashfree order failed (${res.status})`);
  const j = await res.json();
  return { id: j.entity_id ?? "", amount: amountPaise };
}
