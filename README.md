# Typing Skill Zone

Typing Skill Zone is a Next.js app for English/Hindi typing practice, exam simulators, student results, and institute-managed learning.

## Current architecture

- **App:** Next.js 16 + React 19
- **Hosting:** Cloudflare Workers via OpenNext (wrangler.jsonc)
- **Database:** Neon PostgreSQL (DATABASE_URL)
- **Authentication:** Neon Auth (NEON_AUTH_BASE_URL) with application user mapping in public.users
- **Payments:** Cashfree Payment Gateway hosted checkout (sandbox by default)
- **Plans:** Centralized student and institute catalog in lib/pricing.ts

## Start here

Read [SETUP.md](./SETUP.md) before configuring deployment. It replaces the older Better Auth/Resend/Razorpay/Cloudflare Pages instructions.

1. Confirm that the Neon database in DATABASE_URL is the application database and contains the app tables. If only neon_auth.* tables appear, stop and locate the correct database.
2. Configure Neon Auth and Cloudflare variables/secrets from .env.example.
3. Start with Cashfree sandbox credentials and CF_ENVIRONMENT=sandbox.
4. Apply schema/migrations only after taking a backup and verifying the target database.
5. Run checks:
   ```bash
   npm ci
   npm run typecheck
   npm test
   npm run build
   npm run preview
   ```
6. Configure the Cashfree sandbox webhook to https://typingskillzone.in/api/webhook only after the deployment is reachable and its sandbox credentials are set.

## Payment safety

- Server-side plan prices come from lib/pricing.ts; client-submitted amounts are ignored.
- Cashfree client secrets are never returned to the browser.
- Subscription access is granted only after a valid signed PAYMENT_SUCCESS_WEBHOOK matches the pending order's user, plan, INR currency, and amount.
- Webhook processing is idempotent; a repeated successful event must not extend the subscription twice.
- Keep CF_ENVIRONMENT=sandbox until end-to-end sandbox tests pass.

## Database safety

The fresh account/institute reset documented in [FRESH_AUTH_CUTOVER.md](./FRESH_AUTH_CUTOVER.md) is destructive and is separate from payment configuration. It deletes application accounts and selected history/payment/institute records. Do not run it without a verified backup and successful staging rehearsal.
