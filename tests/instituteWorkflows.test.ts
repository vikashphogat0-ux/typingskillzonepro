import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInvitationEmails, parseInstituteBillingPlan } from "../lib/institute-workflows.ts";

test("invitation email normalization trims, lowercases, and deduplicates", () => {
  assert.deepEqual(
    normalizeInvitationEmails([" Student@Example.com ", "student@example.com", "second@example.org"]),
    { emails: ["student@example.com", "second@example.org"] }
  );
});

test("invitation email normalization rejects malformed and oversized input", () => {
  assert.match(normalizeInvitationEmails(["not-an-email"]).error ?? "", /invalid/i);
  assert.match(normalizeInvitationEmails(Array.from({ length: 501 }, (_, i) => `student${i}@example.com`)).error ?? "", /500/);
  assert.match(normalizeInvitationEmails([]).error ?? "", /1 and 500/);
});

test("institute billing plan parser accepts only catalog plan and interval combinations", () => {
  assert.deepEqual(parseInstituteBillingPlan("institute_basic_monthly"), {
    planId: "institute_basic", interval: "monthly", durationDays: 30,
  });
  assert.deepEqual(parseInstituteBillingPlan("institute_growth_annual"), {
    planId: "institute_growth", interval: "annual", durationDays: 365,
  });
  assert.equal(parseInstituteBillingPlan("institute_enterprise_annual"), null);
  assert.equal(parseInstituteBillingPlan("institute_basic_trial"), null);
  assert.equal(parseInstituteBillingPlan(null), null);
});
