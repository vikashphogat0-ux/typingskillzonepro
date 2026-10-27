/** Plan rules. Pure functions so they can be tested and reused on client and server. */
export type PlanId = "free" | "pro";
export type Period = "monthly" | "yearly";

export interface Limits { testsPerDay: number | null; historyRows: number; aiFeedback: boolean }

export const LIMITS: Record<PlanId, Limits> = {
  free: { testsPerDay: 5, historyRows: 5, aiFeedback: false },
  pro: { testsPerDay: null, historyRows: 100, aiFeedback: true },
};

export const PERIOD_DAYS: Record<Period, number> = { monthly: 30, yearly: 365 };

/** Placeholder prices in paise. Set your own with PRO_MONTHLY_PAISE / PRO_YEARLY_PAISE. */
export const DEFAULT_PRICES_PAISE: Record<Period, number> = { monthly: 14900, yearly: 99900 };

export function priceFor(period: Period, env: Record<string, string | undefined> = {}): number {
  const raw = Number(period === "monthly" ? env.PRO_MONTHLY_PAISE : env.PRO_YEARLY_PAISE);
  return Number.isInteger(raw) && raw >= 100 ? raw : DEFAULT_PRICES_PAISE[period];
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
