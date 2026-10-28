# Typing Skill Zone — current setup and test runbook

This repository's current target is **Next.js on Cloudflare Workers + Neon PostgreSQL + Neon Auth + Cashfree Payment Gateway**. Older Better Auth, Resend, Razorpay and Cloudflare Pages instructions are obsolete for this deployment.

## Safety first: confirm the application database

The database used by the deployed site must contain application tables such as `public.users`, `public.subscriptions`, `public.payments`, `public.institutions`, `public.tests`, `public.results`, `public.exam_templates`, and `public.passages`.

Before applying any schema or migration:
1. In Cloudflare Workers & Pages → `typing-skill-zone-v2` → Settings → Variables and secrets, identify the `DATABASE_URL` secret without revealing its value.
2. In Neon, open the database/branch that URL actually points to.
3. Run the read-only table inventory:
   ```sql
   SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_type = 'BASE TABLE'
     AND table_schema NOT IN ('pg_catalog', 'information_schema')
   ORDER BY table_schema, table_name;
   ```
4. If only `neon_auth.*` tables appear, stop. You are not looking at the application schema expected by this repository. Do not run account-reset SQL and do not create `users` manually.
5. Back up the intended database and test any schema changes against a separate staging branch first.

## Environment variables

Set variables in Cloudflare Dashboard → Workers & Pages → `typing-skill-zone-v2` → Settings → Variables and secrets. Set them for **Production** only after sandbox/staging tests pass. Do not commit credentials.

| Name | Type | Purpose |
|---|---|---|
| `DATABASE_URL` | Secret | Neon Postgres connection string for the application database |
| `NEON_AUTH_BASE_URL` | Secret/variable | Exact Neon Auth API base URL copied from Neon Console; do not guess hostnames |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Variable (if needed) | Same Neon Auth URL for any client-side configuration that requires it |
| `NEXT_PUBLIC_URL` | Variable | `https://typingskillzone.in` |
| `CF_ENVIRONMENT` | Variable | Set to `sandbox` while testing; set to `production` only for live payments |
| `CF_MERCHANT_ID` | Secret | Cashfree PG App ID / Client ID |
| `CF_SECRET_KEY` | Secret | Cashfree PG Client Secret |
| `GROQ_API_KEY` | Secret (optional) | AI feedback, if enabled |
| `GROQ_MODEL` | Variable (optional) | AI model name |

Cashfree secrets must be sandbox credentials while `CF_ENVIRONMENT=sandbox`. Never send credentials in chat, screenshots, issues, or pull requests.

## Neon application schema and Cashfree migration

The corrected `db/schema.sql` defines the application tables in dependency order and uses a single Cashfree-compatible `payments` table. It is intended for a new application database; it uses `CREATE TABLE IF NOT EXISTS` and is not a substitute for inspecting an existing database first.

For an existing application database:
1. Export a backup and verify that it can be restored.
2. Test `db/schema.sql` against a separate staging branch only if the application tables are genuinely missing.
3. Apply `db/migrations/20261028_cashfree_pg.sql` only after confirming the application schema exists. This migration adds Cashfree order/session tracking fields, aligns payment statuses, and retains existing payment records.
4. Do not run `db/migrations/20261028_fresh_auth_institute_reset.sql` for payment setup. That separate migration is destructive and deletes accounts and payment/history data.

## Cashfree Payment Gateway setup

The implementation uses Cashfree PG Orders API (API version `2025-01-01`):
- Sandbox API: `https://sandbox.cashfree.com/pg/orders`
- Production API: `https://api.cashfree.com/pg/orders`
- Hosted checkout receives only `payment_session_id`; the client secret is never returned to the browser.
- Order amount is computed on the server from `lib/pricing.ts`, in paise converted to INR rupees.
- A pending payment row records the user, plan, amount and order before checkout.
- Access is activated only after a valid signed Cashfree `PAYMENT_SUCCESS_WEBHOOK` matches a pending order, payment ID, INR currency and exact amount.
- Webhook processing claims a pending payment once and updates/creates the subscription in a single SQL statement. Duplicate webhook deliveries do not extend access again.

Official references:
- [Cashfree PG Orders API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create)
- [Cashfree webhook signature verification](https://www.cashfree.com/docs/api-reference/payments/latest/webhooks/overview)

### Configure Cashfree webhooks for this project

**Canonical endpoint:** `https://typingskillzone.in/api/webhook`

The app also sends this exact URL as Cashfree's `order_meta.notify_url` when creating each order. Configure it in the Cashfree dashboard as well so events are delivered consistently.

1. Open the Cashfree Merchant Dashboard and select the **Sandbox/Test** environment first.
2. Go to **Payment Gateway → Developers → Webhooks** (wording can vary by dashboard version).
3. Add a webhook endpoint URL: `https://typingskillzone.in/api/webhook`. Use HTTPS and do not add a trailing slash or extra query parameters.
4. Subscribe to the **payment success** event named `PAYMENT_SUCCESS_WEBHOOK`. Failed/pending events can be added for monitoring later, but they must never activate a plan.
5. If the dashboard asks for a webhook/API payload version, use `2025-01-01` to match the PG API version used by this code. If that version is not offered for the event, do not guess: inspect the sample payload/version in the dashboard and update the parser/tests before enabling it.
6. Save the endpoint and use Cashfree's test/send-event tool if available.
7. In Cloudflare Workers → `typing-skill-zone-v2` → Settings → Variables and secrets, configure `CF_ENVIRONMENT=sandbox`, `CF_MERCHANT_ID` (sandbox App ID) and `CF_SECRET_KEY` (sandbox Secret Key). The webhook verifier uses the same PG client secret to verify `x-webhook-signature` over the exact raw body plus `x-webhook-timestamp`. Do not create a second `CF_WEBHOOK_SECRET` variable.
8. Confirm the endpoint is reachable by opening `https://typingskillzone.in/api/webhook`; a GET should return `{"ok":true,"endpoint":"cashfree-pg-webhook"}`. This only checks reachability; it does not prove that a signed webhook will verify.
9. Run a sandbox checkout and confirm Cashfree delivers a POST with `x-webhook-signature` and `x-webhook-timestamp`. Check Cloudflare logs and the payment row for the order; never log the secret or full customer/payment payload.
10. Configure the **Production** webhook separately only when you are approved for live payments. Use the production App ID/Secret Key, set `CF_ENVIRONMENT=production`, and verify that the production webhook is registered against the production dashboard environment. Never mix sandbox credentials with production mode or vice versa.

Cashfree webhooks must be treated as asynchronous and potentially repeated. This route verifies the signature before parsing JSON, and the database activation logic only accepts a successful payment that matches an existing pending order and exact INR amount. The customer redirect/return URL is not proof of payment.

### Test checklist

Run through this checklist using a test account and sandbox credentials:

1. **Configuration:** Confirm the worker has `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `CF_ENVIRONMENT=sandbox`, `CF_MERCHANT_ID`, and `CF_SECRET_KEY`.
2. **Auth:** Sign up, sign in, sign out, and request a password reset using Neon Auth.
3. **Checkout validation:** A signed-out request returns 401; free/unknown plans return 400; invalid mobile numbers return 422.
4. **Order creation:** Select a paid plan and valid 10-digit mobile number. Verify a Cashfree sandbox checkout opens and that the API response contains only `orderId`, `paymentSessionId`, `amountPaise`, and `mode`—never credentials.
5. **Webhook security:** Invalid/missing signature returns 400. A signed unrelated event is acknowledged but cannot grant access.
6. **Payment verification:** A successful sandbox payment activates only the plan and amount stored in the pending payment row. Wrong order, payment ID, amount or currency must not grant access.
7. **Idempotency:** Replay the same success webhook; it must not extend the subscription a second time.
8. **Failure handling:** Failed checkout does not grant access. A transient database error from webhook processing returns 5xx so Cashfree can retry.
9. **Institute flows:** Test institute registration, admin approval, owner/teacher/student permissions, join codes, batches and assignments after Neon Auth is configured.
10. **Regression:** Test typing practice, simulators, results/history, admin routes, subscriptions, and contact/support forms.

Only switch `CF_ENVIRONMENT` to `production` after all sandbox checks pass and the production Cashfree credentials/webhook are configured.

## Cloudflare deployment

This repository uses `wrangler.jsonc` and OpenNext for Cloudflare Workers. Do not use the old `wrangler.pages-old.toml` or `wrangler.toml.backup` instructions.

From a local clone after environment values are configured:
```bash
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

Deploy only after CI is green and a preview smoke test succeeds. Cloudflare environment secrets are managed in the dashboard and are not written to GitHub.

## Legacy variables

Do not delete old Better Auth/Resend variables until the deployed Neon Auth flows have been tested. Once the current deployment is verified and no code references them, remove legacy `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `NEXT_PUBLIC_BETTER_AUTH_URL`, and `RESEND_API_KEY` from the Cloudflare Production environment. This cleanup is a separate manual dashboard action.

## Fresh-account reset

The separate `FRESH_AUTH_CUTOVER.md` documents the destructive fresh-account/institute reset. Do not run it as part of Cashfree setup. It requires a verified backup, explicit approval of the data-loss scope, and successful staging rehearsal.
