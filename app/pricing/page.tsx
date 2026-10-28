
"use client";

import { useCallback, useEffect, useState } from "react";
import { rupeesFromPaise, STUDENT_PLANS, type StudentPlanId } from "@/lib/pricing";

interface StudentAccessInfo {
  signedIn: boolean;
  plan?: StudentPlanId;
  endsAt?: string | null;
  viaInstitution: boolean;
  testsLeft: number | null;
  prices?: {
    monthly: number;
    yearly: number;
  };
}

interface CheckoutResponse {
  error?: string;
  paymentSessionId?: string;
  mode?: "sandbox" | "production" | string;
}

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
      }) => Promise<unknown>;
    };
  }
}

const formatPrice = (paise: number) => rupeesFromPaise(paise);

const FEATURE_LABELS: Record<string, string> = {
  accessPremiumPassages: "Premium typing passages",
  accessEnglishTyping: "English typing practice",
  accessHindiTyping: "Hindi typing practice",
  accessMockTests: "Mock tests",
  unlimitedTests: "Unlimited practice tests",
  aiFeedback: "AI-powered feedback",
  detailedAnalytics: "Detailed performance analytics",
  progressTracking: "Progress tracking",
  downloadReports: "Downloadable reports",
  certificates: "Certificates",
  weakKeyAnalysis: "Weak-key analysis",
  practiceStreaks: "Practice streak tracking",
  achievements: "Achievements",
  leaderboardAccess: "Leaderboard access",
  competitionsAccess: "Typing competitions",
};

const FEATURE_ORDER = Object.keys(FEATURE_LABELS);

function getBillingLabel(interval: string, durationDays: number | null) {
  if (interval === "ongoing") return "Ongoing access";
  if (interval === "one_time") {
    return durationDays ? `${durationDays} days of access` : "One-time payment";
  }
  if (durationDays === 30) return "Billed for 30 days";
  if (durationDays === 90) return "Billed for 90 days";
  if (durationDays === 180) return "Billed for 180 days";
  if (durationDays === 365) return "Billed for 365 days";
  return "Subscription access";
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Cashfree) {
      resolve(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cashfree-sdk="true"]'
    );

    if (existing) {
      if (existing.dataset.loaded === "true" && window.Cashfree) {
        resolve(true);
        return;
      }

      existing.addEventListener(
        "load",
        () => resolve(Boolean(window.Cashfree)),
        { once: true }
      );
      existing.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.dataset.cashfreeSdk = "true";

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(Boolean(window.Cashfree));
    };

    script.onerror = () => resolve(false);

    document.head.appendChild(script);
  });
}

export default function Pricing() {
  const [info, setInfo] = useState<StudentAccessInfo | null>(null);
  const [msg, setMsg] = useState("");
  const [busyPlan, setBusyPlan] = useState<StudentPlanId | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMsg("");

    try {
      const response = await fetch("/api/student-access", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load student access.");
      }

      const data = await response.json();

      setInfo({
        signedIn: Boolean(data.signedIn),
        plan: data.plan ?? "free",
        endsAt: data.endsAt ?? null,
        viaInstitution: Boolean(data.viaInstitution),
        testsLeft:
          typeof data.testsLeft === "number" ? data.testsLeft : null,
        prices: data.prices,
      });
    } catch {
      setInfo(null);
      setMsg("Could not load subscription information. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const buy = async (planId: StudentPlanId) => {
    if (busyPlan !== null) return;

    if (!info?.signedIn) {
      setMsg("Please sign in before purchasing a plan.");
      return;
    }

    if (planId === "free") {
      setMsg("The Free plan does not require checkout.");
      return;
    }

    const normalizedPhone = customerPhone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setMsg("Enter your 10-digit mobile number before starting Cashfree checkout.");
      return;
    }

    setBusyPlan(planId);
    setMsg("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId, customerPhone: normalizedPhone }),
      });

      let data: CheckoutResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error("The checkout server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not start payment.");
      }

      if (!data.paymentSessionId) {
        throw new Error(
          "The server did not return a valid payment session."
        );
      }

      const loaded = await loadCheckout();

      if (!loaded || !window.Cashfree) {
        throw new Error(
          "Could not load Cashfree checkout. Please try again."
        );
      }

      const cashfree = window.Cashfree({
        mode: data.mode === "production" ? "production" : "sandbox",
      });

      await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_self",
      });
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Checkout could not be completed. Check your payment status before retrying."
      );
    } finally {
      setBusyPlan(null);
    }
  };

  const isPro =
    Boolean(info?.signedIn) &&
    info?.plan !== undefined &&
    info.plan !== "free" &&
    Boolean(info.endsAt) &&
    new Date(info.endsAt as string).getTime() > Date.now();

  const until = info?.endsAt
    ? new Date(info.endsAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const plans = Object.values(STUDENT_PLANS).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  return (
    <main className="page plans">
      <header className="plans-header">
        <p className="plans-eyebrow">TYPING SKILL ZONE</p>
        <h1>Choose Your Student Plan</h1>
        <p>
          Build typing speed, improve accuracy, and prepare for competitive
          typing examinations with a plan that suits your practice needs.
        </p>
      </header>

      {loading && (
        <p role="status" aria-live="polite">
          Loading your subscription information…
        </p>
      )}

      {!loading && info?.signedIn && (
        <section className="current-subscription" aria-label="Current subscription">
          <h2>Your current access</h2>

          <p>
            <strong>Plan:</strong>{" "}
            {STUDENT_PLANS[info.plan ?? "free"]?.displayName ?? "Free"}
          </p>

          {info.viaInstitution && (
            <p>
              Your access is provided through an institute. Some features may
              be controlled by your institute&apos;s subscription.
            </p>
          )}

          {isPro && until && (
            <p>
              <strong>Access valid until:</strong> {until}
            </p>
          )}

          {info.testsLeft !== null && (
            <p>
              <strong>Tests remaining:</strong> {info.testsLeft}
            </p>
          )}
        </section>
      )}

      {!loading && info && !info.signedIn && (
        <section className="subscription-notice">
          <p>
            Sign in to purchase a plan and associate your subscription with
            your account.
          </p>
        </section>
      )}

      {msg && (
        <div className="pricing-message" role="alert" aria-live="polite">
          <p>{msg}</p>
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            Refresh subscription status
          </button>
        </div>
      )}

      <section className="pricing-phone" aria-label="Payment contact details">
        <label htmlFor="cashfree-customer-phone">Mobile number for payment</label>
        <input
          id="cashfree-customer-phone"
          name="customerPhone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          pattern="[0-9]{10}"
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit mobile number"
          aria-describedby="cashfree-phone-help"
        />
        <p id="cashfree-phone-help">Cashfree requires a valid 10-digit mobile number. Your number is sent to Cashfree only to create the payment order.</p>
      </section>

      <section className="plans-grid" aria-label="Available student plans">
        {plans.map((plan) => {
          const isFree = plan.id === "free";
          const isCurrentPlan = info?.plan === plan.id;
          const isBusy = busyPlan === plan.id;

         const entitlements = plan.featureEntitlements;

          const includedFeatures = FEATURE_ORDER.filter(
  (key) =>
    key in entitlements &&
    entitlements[key as keyof typeof entitlements] === true
);

          return (
            <article
              className={`plan-card${plan.id === "student_pro_annual" ? " plan-card-featured" : ""}`}
              key={plan.id}
            >
              {plan.id === "student_pro_annual" && (
                <p className="plan-badge">Annual plan</p>
              )}

              <h2>{plan.displayName}</h2>

              <p className="plan-price">
                <strong>{formatPrice(plan.amountPaise)}</strong>
              </p>

              <p className="plan-billing">
                {getBillingLabel(plan.billingInterval, plan.durationDays)}
              </p>

              {plan.durationDays !== null && (
                <p className="plan-duration">
                  Duration: {plan.durationDays} days
                </p>
              )}

              <ul className="plan-features">
                {includedFeatures.length > 0 ? (
                  includedFeatures.map((key) => (
                    <li key={key}>{FEATURE_LABELS[key]}</li>
                  ))
                ) : (
                  <li>Access according to the Free plan entitlements</li>
                )}
              </ul>

              {isCurrentPlan && (
                <p className="plan-current-label">
                  Your current plan
                </p>
              )}

              <button
                type="button"
                className="plan-action"
                onClick={() => void buy(plan.id)}
                disabled={
                  loading ||
                  busyPlan !== null ||
                  isFree ||
                  isCurrentPlan ||
                  Boolean(info?.viaInstitution)
                }
              >
                {isBusy
                  ? "Connecting to Cashfree…"
                  : isFree
                    ? "Free plan"
                    : isCurrentPlan
                      ? "Current plan"
                      : info?.viaInstitution
                        ? "Institute-managed access"
                        : !info?.signedIn
                          ? "Sign in to purchase"
                          : "Choose plan"}
              </button>
            </article>
          );
        })}
      </section>

      <section className="pricing-notes">
        <h2>Before you purchase</h2>
        <ul>
          <li>
            Prices are read from the central pricing catalog; this page does
            not independently define payment amounts.
          </li>
          <li>
            Checkout starts only after the server creates a payment session.
          </li>
          <li>
            Payment completion and subscription activation must be confirmed
            by the server-side payment verification flow.
          </li>
        </ul>
      </section>
    </main>
  );
}
