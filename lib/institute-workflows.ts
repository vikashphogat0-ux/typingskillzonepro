import type { InstitutePlanId } from "./pricing";

export type InstituteBillingInterval = "monthly" | "annual";
export interface ParsedInstituteBillingPlan {
  planId: Extract<InstitutePlanId, "institute_basic" | "institute_growth">;
  interval: InstituteBillingInterval;
  durationDays: 30 | 365;
}

/** Parse the trusted catalog identifier stored on an institute Cashfree order. */
export function parseInstituteBillingPlan(value: unknown): ParsedInstituteBillingPlan | null {
  if (typeof value !== "string") return null;
  const match = /^(institute_basic|institute_growth)_(monthly|annual)$/.exec(value);
  if (!match) return null;
  const interval = match[2] as InstituteBillingInterval;
  return {
    planId: match[1] as ParsedInstituteBillingPlan["planId"],
    interval,
    durationDays: interval === "annual" ? 365 : 30,
  };
}

/** Normalize and deduplicate email addresses received from a single-address or CSV import. */
export function normalizeInvitationEmails(input: unknown): { emails: string[]; error?: string } {
  const values = Array.isArray(input) ? input : [input];
  if (values.length < 1 || values.length > 500) return { emails: [], error: "Send between 1 and 500 email addresses per import." };
  const emails = [...new Set(values.map((value) => String(value ?? "").trim().toLowerCase()).filter(Boolean))];
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emails.length || emails.some((email) => email.length > 254 || !pattern.test(email))) {
    return { emails: [], error: "One or more email addresses are invalid." };
  }
  return { emails };
}
