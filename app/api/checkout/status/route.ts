import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Return only the signed-in user's own Cashfree order status.
 * The verified webhook remains the sole authority that activates access.
 */
export async function GET(req: Request) {
  const uid = await getUserId(req);
  if (!uid) {
    return Response.json(
      { error: "Sign in to check this payment." },
      { status: 401, headers: { "cache-control": "private, no-store" } }
    );
  }

  const orderId = new URL(req.url).searchParams.get("order_id")?.trim();
  if (!orderId || orderId.length > 128) {
    return Response.json(
      { error: "A valid order ID is required." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }

  try {
    const [payment] = await sql()`
      SELECT status, plan_id, amount_paise, currency, paid_at
      FROM payments
      WHERE order_id = ${orderId}
        AND user_id = ${uid}
        AND provider = 'cashfree'
      LIMIT 1
    `;

    // Do not reveal whether an order belonging to another account exists.
    if (!payment) {
      return Response.json(
        { error: "Payment order not found." },
        { status: 404, headers: { "cache-control": "private, no-store" } }
      );
    }

    return Response.json(
      {
        status: payment.status,
        planId: payment.plan_id,
        amountPaise: Number(payment.amount_paise),
        currency: payment.currency,
        paidAt: payment.paid_at ? new Date(payment.paid_at).toISOString() : null,
      },
      { headers: { "cache-control": "private, no-store, max-age=0", vary: "Cookie" } }
    );
  } catch (error) {
    console.error("Checkout status lookup failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json(
      { error: "Unable to check payment status right now." },
      { status: 503, headers: { "cache-control": "private, no-store" } }
    );
  }
}
