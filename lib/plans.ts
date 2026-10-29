/** Legacy plan helpers kept for compatibility; pricing and entitlements come from lib/pricing.ts. */
import { LIMITS as CATALOG_LIMITS, STUDENT_PLANS } from "./pricing";
export type PlanId = "free" | "pro";
export type Period = "monthly" | "yearly";

export interface Limits { testsPerDay: number | null; historyRows: number; aiFeedback: boolean }

export const LIMITS: Record<PlanId, Limits> = {
  free: {
    testsPerDay: CATALOG_LIMITS.free.testsPerDay,
    historyRows: CATALOG_LIMITS.free.historyRows,
    aiFeedback: STUDENT_PLANS.free.featureEntitlements.aiFeedback,
  },
  pro: {
    testsPerDay: CATALOG_LIMITS.pro.testsPerDay,
    historyRows: CATALOG_LIMITS.pro.historyRows,
    aiFeedback: STUDENT_PLANS.student_pro_monthly.featureEntitlements.aiFeedback,
  },
};

export const PERIOD_DAYS: Record<Period, number> = { monthly: 30, yearly: 365 };

/** Compatibility values sourced from the server-authoritative checkout catalog. */
export const DEFAULT_PRICES_PAISE: Record<Period, number> = {
  monthly: STUDENT_PLANS.student_pro_monthly.amountPaise,
  yearly: STUDENT_PLANS.student_pro_annual.amountPaise,
};

/** Environment overrides are intentionally ignored so display prices cannot diverge from checkout. */
export function priceFor(period: Period, _env: Record<string, string | undefined> = {}): number {
  return DEFAULT_PRICES_PAISE[period];
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export interface SubRow { plan: string; status: string; ends_at: string | Date | null }

/** Pro only while an active pro subscription has not yet ended. */
export function effectivePlan(sub: SubRow | null | undefined, now: Date = new Date()): PlanId {
  if (!sub || sub.plan !== "pro" || sub.status !== "active" || !sub.ends_at) return "free";
  return new Date(sub.ends_at).getTime() > now.getTime() ? "pro" : "free";
}

/** New end date for a purchase. Renewing early adds to the time left instead of losing it. */
export function extendedEnd(currentEnd: Date | string | null, days: number, now: Date = new Date()): Date {
  const cur = currentEnd ? new Date(currentEnd) : null;
  const from = cur && cur.getTime() > now.getTime() ? cur : now;
  return new Date(from.getTime() + days * 86400000);
}

/** Tests the user may still start today, or null for unlimited. */
export function testsLeft(plan: PlanId, usedToday: number): number | null {
  const cap = LIMITS[plan].testsPerDay;
  return cap === null ? null : Math.max(0, cap - usedToday);
}
