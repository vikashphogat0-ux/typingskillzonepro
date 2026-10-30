import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  cashfreeMode,
  createPaymentOrder,
  verifyWebhookSignature,
} from "../lib/cashfree.ts";

test("Cashfree defaults to sandbox unless production is explicitly selected", () => {
  const old = process.env.CF_ENVIRONMENT;
  try {
    delete process.env.CF_ENVIRONMENT;
    assert.equal(cashfreeMode(), "sandbox");
    process.env.CF_ENVIRONMENT = "production";
    assert.equal(cashfreeMode(), "production");
    process.env.CF_ENVIRONMENT = "unexpected";
    assert.equal(cashfreeMode(), "sandbox");
  } finally {
    if (old === undefined) delete process.env.CF_ENVIRONMENT;
    else process.env.CF_ENVIRONMENT = old;
  }
});

test("Cashfree webhook signature verifies exact timestamp + raw body", () => {
  const secret = "test-webhook-secret";
  const timestamp = "1730000000";
  const body = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id: "order_test" } } });
  const signature = createHmac("sha256", secret).update(timestamp + body, "utf8").digest("base64");

  assert.equal(verifyWebhookSignature(body, timestamp, signature, secret), true);
  assert.equal(verifyWebhookSignature(body + " ", timestamp, signature, secret), false);
  assert.equal(verifyWebhookSignature(body, timestamp, "invalid", secret), false);
  assert.equal(verifyWebhookSignature(body, "", signature, secret), false);
});

test("Cashfree order creation uses the PG Orders API and never returns credentials", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    CF_ENVIRONMENT: process.env.CF_ENVIRONMENT,
    CF_MERCHANT_ID: process.env.CF_MERCHANT_ID,
    CF_SECRET_KEY: process.env.CF_SECRET_KEY,
  };
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  try {
    process.env.CF_ENVIRONMENT = "sandbox";
    process.env.CF_MERCHANT_ID = "sandbox-app-id";
    process.env.CF_SECRET_KEY = "sandbox-secret";

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({
        order_id: "tsz_test_123",
        payment_session_id: "session_test_123",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    const result = await createPaymentOrder({
      orderId: "tsz_test_123",
      amountPaise: 9900,
      idempotencyKey: "test-idempotency-key",
      customerId: "test-user",
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "9876543210",
      planId: "student_pro_monthly",
      returnUrl: "https://typingskillzone.in/pricing?order_id={order_id}",
      notifyUrl: "https://typingskillzone.in/api/webhook",
    });

    assert.equal(capturedUrl, "https://sandbox.cashfree.com/pg/orders");
    assert.equal(new Headers(capturedInit?.headers).get("x-client-id"), "sandbox-app-id");
    assert.equal(new Headers(capturedInit?.headers).get("x-client-secret"), "sandbox-secret");
    assert.equal(new Headers(capturedInit?.headers).get("x-api-version"), "2025-01-01");
    const sentBody = JSON.parse(String(capturedInit?.body));
    assert.equal(sentBody.order_amount, 99);
    assert.equal(sentBody.order_currency, "INR");
    assert.equal(sentBody.customer_details.customer_phone, "9876543210");
    assert.equal(result.paymentSessionId, "session_test_123");
    assert.equal(result.mode, "sandbox");
    assert.equal(JSON.stringify(result).includes("sandbox-secret"), false);
    assert.equal(JSON.stringify(result).includes("sandbox-app-id"), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Cashfree payment verification requires gateway-confirmed success and exact amount", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    CF_ENVIRONMENT: process.env.CF_ENVIRONMENT,
    CF_MERCHANT_ID: process.env.CF_MERCHANT_ID,
    CF_SECRET_KEY: process.env.CF_SECRET_KEY,
  };
  try {
    process.env.CF_ENVIRONMENT = "sandbox";
    process.env.CF_MERCHANT_ID = "sandbox-app-id";
    process.env.CF_SECRET_KEY = "sandbox-secret";
    globalThis.fetch = (async () => new Response(JSON.stringify([
      { cf_payment_id: "pay_test", payment_status: "SUCCESS", payment_amount: 99, payment_currency: "INR" },
      { cf_payment_id: "pay_pending", payment_status: "PENDING", payment_amount: 99, payment_currency: "INR" },
    ]), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

    const { verifyCashfreePayment } = await import("../lib/cashfree.ts");
    assert.deepEqual(await verifyCashfreePayment("order_test", "pay_test", 9900), {
      paymentId: "pay_test", amountPaise: 9900, currency: "INR",
    });
    assert.equal(await verifyCashfreePayment("order_test", "pay_wrong", 9900), null);
    assert.equal(await verifyCashfreePayment("order_test", "pay_test", 10000), null);
    assert.equal(await verifyCashfreePayment("order_test", "pay_pending", 9900), null);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
