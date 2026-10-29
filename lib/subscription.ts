import { sql } from "./db";
import {
  STUDENT_PLANS,
  getStudentPlan,
  LIMITS,
  type StudentPlanId,
} from "./pricing";

export interface StudentAccess {
  plan: StudentPlanId;
  endsAt: string | null;
  limits: {
    testsPerDay: number | null;
    historyRows: number;
    aiFeedback: boolean;
    premiumPassages: boolean;
    mockTests: boolean;
    detailedAnalytics: boolean;
    weakKeyAnalysis: boolean;
    downloadReports: boolean;
    certificates: boolean;
  };
  testsToday: number;
  testsLeft: number | null;
  viaInstitution: boolean;
  currency: string;
  amountPaid: number;
  billingInterval: string;
  durationDays: number | null;
  isPro: boolean;
  isPaid: boolean;
}

export async function getStudentAccess(
  uid: string
): Promise<StudentAccess> {
  const db = sql();

  const [subscription] = await db`
    SELECT plan, status, ends_at
    FROM subscriptions
    WHERE user_id = ${uid}
      AND status = 'active'
      AND ends_at > now()
      AND plan <> 'free'
    ORDER BY ends_at DESC NULLS LAST
    LIMIT 1
  `;

  const [countRow] = await db`
    SELECT count(*)::int AS n
    FROM tests
    WHERE user_id = ${uid}
      AND started_at >= (
        date_trunc(
          'day',
          now() AT TIME ZONE 'Asia/Kolkata'
        ) AT TIME ZONE 'Asia/Kolkata'
      )
  `;

  const candidate = subscription?.plan as
    | StudentPlanId
    | undefined;

  const validPlanId =
    candidate && Object.hasOwn(STUDENT_PLANS, candidate)
      ? candidate
      : "free";

  const [institutionMembership] = await db`
    SELECT 1 AS ok
    FROM institution_members im
    JOIN institutions i ON i.id = im.institution_id
    WHERE im.user_id = ${uid}
      AND i.status = 'approved'
    LIMIT 1
  `;

  // The query only returns a currently active, unexpired paid subscription.
  const subscriptionActive = Boolean(subscription);

  const planId: StudentPlanId =
    validPlanId !== "free" && subscriptionActive
      ? validPlanId
      : "free";

  const plan = getStudentPlan(planId)!;
  const entitlements = plan.featureEntitlements;
  const viaInstitution =
    planId === "free" && Boolean(institutionMembership);

  const testsToday = Number(countRow?.n ?? 0);

  const limits = {
    testsPerDay:
      viaInstitution || entitlements.unlimitedTests
        ? null
        : LIMITS.free.testsPerDay,
    historyRows: viaInstitution
      ? 100
      : entitlements.historyRows,
    aiFeedback: entitlements.aiFeedback,
    premiumPassages: entitlements.accessPremiumPassages,
    mockTests: entitlements.accessMockTests,
    detailedAnalytics: entitlements.detailedAnalytics,
    weakKeyAnalysis: entitlements.weakKeyAnalysis,
    downloadReports: entitlements.downloadReports,
    certificates: entitlements.certificates,
  };

  return {
    plan: planId,
    endsAt: subscription?.ends_at
      ? new Date(subscription.ends_at).toISOString()
      : null,
    limits,
    testsToday,
    testsLeft:
      limits.testsPerDay === null
        ? null
        : Math.max(0, limits.testsPerDay - testsToday),
    viaInstitution,
    currency: plan.currency,
    amountPaid: 0,
    billingInterval: plan.billingInterval,
    durationDays: plan.durationDays,
    isPro: planId !== "free",
    isPaid: subscriptionActive,
  };
}

/**
 * Payment activation must only be called after the Cashfree
 * payment has been verified on the server.
 *
 * Connect this function to the existing verified-payment flow.
 * Do not call it directly from the browser.
 */
export async function processPaidOrder(
  orderId: string,
  paymentId: string,
  amountPaise: number,
  currency: string
): Promise<boolean> {
  if (!orderId || !paymentId || !Number.isSafeInteger(amountPaise) || amountPaise <= 0 || currency !== "INR") {
    return false;
  }

  const db = sql();
  const [payment] = await db`
    SELECT user_id, plan_id, amount_paise, currency, status, payment_id
    FROM payments
    WHERE order_id = ${orderId} AND provider = 'cashfree'
    LIMIT 1
  `;

  if (!payment) return false;
  if (payment.status === "paid") {
    return String(payment.payment_id ?? "") === paymentId;
  }
  if (
    payment.status !== "pending" ||
    !payment.user_id ||
    Number(payment.amount_paise) !== amountPaise ||
    String(payment.currency) !== currency
  ) return false;

  const planId = String(payment.plan_id ?? "") as StudentPlanId;
  const plan = getStudentPlan(planId);
  if (!plan || planId === "free" || !plan.durationDays) return false;

  // A single SQL statement claims the pending payment and activates/extends
  // the subscription. Replayed webhook events cannot claim the row twice.
  const [result] = await db`
    WITH claimed AS (
      UPDATE payments
      SET status = 'paid',
          payment_id = ${paymentId},
          gateway_event_id = ${paymentId},
          verified_at = now(),
          paid_at = now(),
          updated_at = now(),
          failure_reason = NULL
      WHERE order_id = ${orderId}
        AND provider = 'cashfree'
        AND status = 'pending'
        AND user_id = ${payment.user_id}
        AND plan_id = ${planId}
        AND amount_paise = ${amountPaise}
        AND currency = ${currency}
      RETURNING user_id, plan_id
    ),
    existing AS (
      SELECT s.id
      FROM subscriptions s
      JOIN claimed c ON c.user_id = s.user_id AND c.plan_id = s.plan
      ORDER BY s.ends_at DESC NULLS LAST
      LIMIT 1
    ),
    updated AS (
      UPDATE subscriptions s
      SET starts_at = COALESCE(s.starts_at, now()),
          ends_at = GREATEST(COALESCE(s.ends_at, now()), now()) + (${plan.durationDays} * interval '1 day'),
          status = 'active'
      FROM existing e
      WHERE s.id = e.id
      RETURNING s.id
    ),
    inserted AS (
      INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at, is_institute)
      SELECT c.user_id, c.plan_id, 'active', now(),
             now() + (${plan.durationDays} * interval '1 day'), false
      FROM claimed c
      WHERE NOT EXISTS (SELECT 1 FROM updated)
      RETURNING id
    )
    SELECT (SELECT count(*)::int FROM claimed) AS claimed_count,
           (SELECT count(*)::int FROM updated) AS updated_count,
           (SELECT count(*)::int FROM inserted) AS inserted_count
  `;

  if (Number(result?.claimed_count ?? 0) === 1) return true;

  // Handles concurrent/retried webhooks after another request completed.
  const [latest] = await db`
    SELECT status, payment_id
    FROM payments
    WHERE order_id = ${orderId} AND provider = 'cashfree'
    LIMIT 1
  `;
  return latest?.status === "paid" && String(latest.payment_id ?? "") === paymentId;
}

export async function grantPro(
  uid: string,
  days: number,
  planId: StudentPlanId = "student_pro_monthly"
) {
  if (!Number.isInteger(days) || days <= 0 || planId === "free") {
    throw new Error("Invalid plan or duration.");
  }

  const db = sql();

  const [current] = await db`
    SELECT id, ends_at
    FROM subscriptions
    WHERE user_id = ${uid}
      AND plan = ${planId}
      AND status = 'active'
    ORDER BY ends_at DESC NULLS LAST
    LIMIT 1
  `;

  const end = new Date(
    Math.max(
      Date.now(),
      current?.ends_at
        ? new Date(current.ends_at).getTime()
        : Date.now()
    ) + days * 86400000
  ).toISOString();

  if (current) {
    await db`
      UPDATE subscriptions
      SET ends_at = ${end}, status = 'active'
      WHERE id = ${current.id}
    `;
  } else {
    await db`
      INSERT INTO subscriptions (
        user_id, plan, status, starts_at, ends_at
      )
      VALUES (
        ${uid}, ${planId}, 'active', now(), ${end}
      )
    `;
  }

  return end;
}

export async function revokePro(
  uid: string,
  planId: StudentPlanId = "student_pro_monthly"
) {
  await sql()`
    UPDATE subscriptions
    SET status = 'cancelled', ends_at = now()
    WHERE user_id = ${uid}
      AND plan = ${planId}
      AND status = 'active'
  `;
}