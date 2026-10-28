import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Read-only return-page check for Cashfree payment status.
 *
 * The browser is not a trusted payment verifier. Only the signed Cashfree
 * webhook may transition a payment to paid and activate a subscription.
 * This endpoint merely reports whether that webhook has already processed
 * the specific order for the currently authenticated user.
 */
export async function POST(req: Request) {
  try {
    const uid = await getUserId(req);
    if (!uid) {
      return Response.json(
        { ok: false, status: "unauthenticated", error: "Sign in again to check your payment." },
        { status: 401, headers: { "cache-control": "no-store" } }
      );
    }

    const body = await req.json().catch(() => null);
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    const paymentId = typeof body?.paymentId === "string" ? body.paymentId.trim() : "";
    if (!orderId || !paymentId || orderId.length > 128 || paymentId.length > 128) {
      return Response.json(
        { ok: false, status: "invalid_request", error: "A valid order ID and payment ID are required." },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    const [payment] = await sql()`
      SELECT status, payment_id
      FROM payments
      WHERE order_id = ${orderId} AND user_id = ${uid}
      LIMIT 1
    `;

    if (payment?.status === "paid" && String(payment.payment_id ?? "") === paymentId) {
      return Response.json(
        { ok: true, status: "paid" },
        { headers: { "cache-control": "no-store" } }
      );
    }

    // The signed webhook may still be in flight. Do not change payment or
    // subscription rows based on client-supplied identifiers.
    return Response.json(
      { ok: false, status: "pending", message: "Payment confirmation is pending. Refresh this page shortly." },
      { status: 202, headers: { "cache-control": "no-store", "retry-after": "3" } }
    );
  } catch (error) {
    console.error("Payment status check failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json(
      { ok: false, status: "unavailable", error: "Could not check payment status. Please try again." },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
