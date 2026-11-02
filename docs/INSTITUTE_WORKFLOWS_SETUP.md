# Institute workflow setup

The institute workflows are implemented additively. They preserve existing users, memberships, payment history, and subscription records.

## Required runtime configuration

Configure these as Cloudflare Worker secrets/variables for the deployed application:

- `CF_MERCHANT_ID`: existing Cashfree app/merchant ID.
- `CF_SECRET_KEY`: existing Cashfree secret key.
- `CF_ENVIRONMENT`: `sandbox` or `production`.
- `RESEND_API_KEY`: Resend API key authorized to send from your domain.
- `RESEND_FROM_EMAIL`: verified sender, for example `TypingSkillZone <support@typingskillzone.in>`.
- `INSTITUTE_CRON_SECRET`: long random secret used only by the daily notification job.
- `NEXT_PUBLIC_URL`: canonical site origin, such as `https://typingskillzone.in`.

Set the same `INSTITUTE_CRON_SECRET` in GitHub Actions repository secrets. Never commit secret values.

## Database migration

Apply `db/migrations/20261102_institute_workflows.sql` to the existing Neon database using the project's established migration process. It only adds the institute invitation and notification-log tables, and an additive payment index/reference column if missing. It does not reset, drop, truncate, or replace existing data.

Do not run `db/schema.sql` against production as a substitute for the migration.

## Cashfree institute billing

The institute owner's Billing tab creates a pending Cashfree order using the centralized Basic/Growth catalog. The signed Cashfree webhook independently verifies the payment with Cashfree before activating/extending `institute_subscriptions`. The browser return page only reads payment state; it cannot activate access.

Configure the Cashfree webhook URL as:

`https://typingskillzone.in/api/webhook`

Use the existing Cashfree webhook signing secret configuration already used by the student checkout.

## CSV enrollment and invitations

The Students tab accepts a CSV file or pasted email list (up to 500 unique addresses). Existing accounts are enrolled immediately subject to the active subscription and seat limit. New addresses receive a seven-day, single-use invitation. The invite token is stored only as a SHA-256 hash, and acceptance requires a signed-in account whose email matches the invitation.

## Expiry and renewal notifications

`.github/workflows/institute-notifications.yml` runs daily at 09:00 IST and can also be triggered manually from GitHub Actions. It sends 7-day, 3-day, 1-day, and expired notices to the institute owner's email. A unique database log prevents duplicate notices.

The workflow requires the GitHub Actions secret `INSTITUTE_CRON_SECRET`; the same value must be configured in the Cloudflare Worker. Email delivery also requires the Resend runtime configuration above.

## Verification checklist after configuration

1. Apply the additive migration to the intended Neon database.
2. Configure the runtime secrets and GitHub Actions secret.
3. Approve a test institute and use Cashfree sandbox to purchase Basic or Growth.
4. Confirm the webhook marks the payment paid and creates/extends the institute subscription.
5. Import a CSV containing one existing test account and one new email address.
6. Sign up using the invited address and accept the invite link.
7. Trigger the notification workflow manually against a test subscription schedule and inspect its JSON result and email delivery.
8. Verify seats, assignments, and institute entitlements using separate owner, teacher, and student accounts.

No production deployment, database migration, or payment transaction is performed by the code changes themselves.
