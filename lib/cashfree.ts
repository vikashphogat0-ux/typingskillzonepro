import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

export type CashfreeMode = "sandbox" | "production";
export const CASHFREE_API_VERSION = "2023-08-01";

export function cashfreeMode(): CashfreeMode {
  return process.env.CF_ENVIRONMENT?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

function cashfreeApiBaseUrl(): string {
  return cashfreeMode() === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function hmacBase64(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("base64");
}

function constantTimeBase64Equal(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cashfree PG webhooks sign timestamp + exact raw request body using HMAC-SHA256. */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !timestamp || !signature || !webhookSecret) return false;
  const expected = hmacBase64(`${timestamp}${rawBody}`, webhookSecret);
  return constantTimeBase64Equal(expected, signature);
}

export interface CreateCashfreeOrderInput {
  orderId: string;
  amountPaise: number;
  idempotencyKey: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planId: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface CashfreeOrder {
  orderId: string;
  paymentSessionId: string;
  amountPaise: number;
  mode: CashfreeMode;
}

/**
 * Create a Cashfree Payment Gateway order using the current PG Orders API.
 * Secret credentials remain server-side; only payment_session_id is returned
 * to the browser for Cashfree's hosted checkout.
 */
export async function createPaymentOrder(input: CreateCashfreeOrderInput): Promise<CashfreeOrder> {
  const clientId = requiredEnv("CF_MERCHANT_ID");
  const clientSecret = requiredEnv("CF_SECRET_KEY");
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new Error("Invalid Cashfree order amount");
  }
  if (!/^\d{10}$/.test(input.customerPhone)) {
    throw new Error("Enter a valid 10-digit mobile number for payment");
  }

  const amount = (input.amountPaise / 100).toFixed(2);
  const response = await fetch(`${cashfreeApiBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-id": clientId,
      "x-client-secret": clientSecret,
      "x-api-version": CASHFREE_API_VERSION,
      "x-idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: input.customerId.slice(0, 50),
        customer_name: input.customerName.slice(0, 100) || "Typing Skill Zone user",
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
      order_note: `Typing Skill Zone - ${input.planId}`.slice(0, 250),
      order_tags: {
        plan_id: input.planId,
      },
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.message ?? payload?.type ?? `HTTP ${response.status}`;
    // Avoid including request credentials or response headers in thrown errors.
    throw new Error(`Cashfree could not create the order: ${String(detail).slice(0, 180)}`);
  }

  const orderId = String(payload?.order_id ?? "");
  const paymentSessionId = String(payload?.payment_session_id ?? "");
  if (orderId !== input.orderId || !paymentSessionId) {
    throw new Error("Cashfree returned an incomplete order response");
  }

  return {
    orderId,
    paymentSessionId,
    amountPaise: input.amountPaise,
    mode: cashfreeMode(),
  };
}
