# Fresh Neon Auth + institute setup (manual cutover)

## Important: destructive migration

The migration `db/migrations/20261028_fresh_auth_institute_reset.sql` deletes all existing application user accounts, including the legacy password hashes and provider IDs stored in the app's `users` table. It also deletes account-linked results/tests, saved passages, subscriptions, **payment rows**, institutes, institute memberships, batches, assignments, institute subscriptions/add-ons, admin action logs, audit history, legacy sessions, and password-reset tokens. It clears passage `created_by` references but preserves shared passage text, exam templates, contact/support messages, and schema.

**Payment rows are deleted by this migration.** If financial/audit records must be retained, do not run this migration as written; revise the scope to preserve/anonymize them first.

This SQL migration does **not** delete identities managed separately inside the Neon Auth service. If there are already Neon Auth identities and you require those removed too, review and remove them through Neon Auth's supported dashboard/management flow; do not directly delete provider-managed auth tables with ad-hoc SQL.

**Do not run this against production until a verified backup exists, the affected-data list has been approved, and the intended Neon project/database is confirmed.** This migration is not automatically run by app startup or deployment. Test it on a restored backup/staging database first and compare row counts before/after.

## Environment

Set these in the deployment environment (not in Git):
- `DATABASE_URL`: connection string for the intended Neon Postgres database.
- `NEON_AUTH_BASE_URL`: Neon Auth API base URL for the same Neon project/environment.
- `NEXT_PUBLIC_NEON_AUTH_URL`: public Neon Auth URL only if the frontend/Neon dashboard setup requires it.

Never commit secrets or paste them into issues or pull requests. Redeploy after updating environment variables.

## Cutover order

1. Export a database backup and verify that it can be restored.
2. Confirm the Neon Auth project is enabled and its allowed redirect/callback URLs include the deployed Typing Skill Zone origin and `/reset-password`.
3. Test the migration on a staging copy and review row counts for every table in the destructive list above.
4. Decide whether payment and audit history may be deleted. If not, revise the migration before execution.
5. Apply the migration manually to the exact intended database only after approval.
6. Deploy the merged app with the Neon Auth environment variables.
7. Create the intended administrator account through the normal Neon Auth signup flow. Do not expose a public admin-registration endpoint.
8. Promote only that newly created account using a trusted, authenticated database/admin operation after verifying its Neon Auth identity and email. Example SQL, to be run manually only after verifying the target email and identity:
   ```sql
   UPDATE users
   SET role = 'admin'
   WHERE lower(email) = lower('YOUR_VERIFIED_ADMIN_EMAIL')
     AND neon_auth_user_id IS NOT NULL;
   ```
   Replace the placeholder locally; do not commit real email addresses or credentials.
9. Register each typing institute through the application. The owner account becomes the institute owner; invite teachers/students through the institute panel or join code. Approve each institute through the admin panel. No old institute memberships or owner/teacher roles survive the reset.
10. Smoke-test sign-up, sign-in, sign-out, password reset, account provisioning, admin-only routes, institute registration/approval, owner/teacher/student permissions, join codes, assignments, student progress, subscriptions and payment checkout/webhooks.
11. Check production logs and row counts. Confirm the preserved exam templates/passages and contact messages remain present.

## Account and institute behavior

New Neon Auth identities are mapped to a new application `users` row. New accounts start with the default `student` role. Admin privileges must be granted only through the trusted manual promotion process above. Institute privileges come from fresh `institution_members` rows created through the application; the reset removes all previous memberships and institute data.

## Rollback

Do not attempt to reverse this destructive migration with compensating SQL. Restore the verified pre-cutover backup to a separate database and re-point the application only through an explicitly approved recovery procedure.
