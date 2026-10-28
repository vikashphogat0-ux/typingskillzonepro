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
| `CF_WEBHOOK_SECRET` | Secret | Use the Cashfree PG client secret unless the merchant dashboard explicitly supplies a separate signing secret |
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

The implementation uses Cashfree PG Orders API (API version `2023-08-01`):
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

### Configure the webhook

In the Cashfree merchant dashboard, configure the webhook URL:
`https://typingskillzone.in/api/webhook`

Enable the payment-success webhook event (`PAYMENT_SUCCESS_WEBHOOK`). Keep `CF_ENVIRONMENT=sandbox` and use sandbox API credentials during testing. Make sure the webhook endpoint is reachable over HTTPS.

### Test checklist

Run through this checklist using a test account and sandbox credentials:

1. **Configuration:** Confirm the worker has `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `CF_ENVIRONMENT=sandbox`, `CF_MERCHANT_ID`, `CF_SECRET_KEY`, and `CF_WEBHOOK_SECRET`.
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
