import { sql } from "./db";
import {
  STUDENT_PLANS,
  getStudentPlan,
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

/**
 * The Free daily allowance below is a temporary default.
 * Move it to the central pricing catalog before production.
 */
const FREE_TESTS_PER_DAY = 3;

export async function getStudentAccess(
  uid: string
): Promise<StudentAccess> {
  const db = sql();

  const [subscription] = await db`
    SELECT plan, status, ends_at
    FROM subscriptions
    WHERE user_id = ${uid}
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

  const subscriptionActive =
    subscription?.status === "active" &&
    subscription?.ends_at != null &&
    new Date(subscription.ends_at).getTime() > Date.now();

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
        : FREE_TESTS_PER_DAY,
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
  planId: StudentPlanId
): Promise<boolean> {
  const plan = getStudentPlan(planId);

  if (!plan || planId === "free" || !plan.durationDays) {
    throw new Error("Invalid paid student plan.");
  }

  /*
   * IMPORTANT:
   * Implement this operation using your existing database
   * transaction support and actual payments schema:
   *
   * 1. Lock/claim the pending order.
   * 2. Verify its user, plan, amount and currency against
   *    the stored order and central pricing catalog.
   * 3. Return false if the order was already processed.
   * 4. Mark the payment paid.
   * 5. Extend or create the subscription exactly once.
   * 6. Commit both changes atomically.
   *
   * Do not use a client-supplied plan or amount as proof
   * of payment. Do not activate access before verification.
   */

  throw new Error(
    `Connect verified Cashfree order ${orderId} / ${paymentId} ` +
      `to the existing transactional payment processor for ${planId}.`
  );
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