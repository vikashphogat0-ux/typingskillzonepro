-- READ-ONLY Typing Skill Zone production preflight.
-- Run in Neon SQL Editor on the intended production branch.
-- This script does not insert, update, delete, create, alter, or drop anything.
-- It reports schema/configuration metadata only; no user emails or row contents.

SELECT
  current_database() AS database_name,
  current_user AS database_role,
  current_schema() AS current_schema,
  now() AS checked_at;

-- Confirm expected schemas exist. Neon Auth being configured on a branch is
-- separate from the application tables in public.
SELECT expected.schema_name,
       CASE WHEN actual.schema_name IS NULL THEN 'MISSING' ELSE 'present' END AS status
FROM (VALUES ('public'), ('neon_auth')) AS expected(schema_name)
LEFT JOIN information_schema.schemata AS actual
  ON actual.schema_name = expected.schema_name
ORDER BY expected.schema_name;

-- Report presence of application tables without querying their data.
WITH expected(table_name, purpose) AS (
  VALUES
    ('users', 'Application user profiles and Neon identity mapping'),
    ('subscriptions', 'Student subscriptions'),
    ('payments', 'Payment/order records'),
    ('institutions', 'Institute accounts'),
    ('institution_members', 'Institute memberships'),
    ('batches', 'Institute batches'),
    ('batch_members', 'Batch membership'),
    ('assignments', 'Institute assignments'),
    ('institute_plans', 'Institute pricing catalog'),
    ('institute_subscriptions', 'Institute entitlements'),
    ('add_on_purchases', 'Institute add-on purchases'),
    ('exam_templates', 'Exam/simulator catalog'),
    ('passages', 'Passage library'),
    ('tests', 'Typing test attempts'),
    ('results', 'Typing test results'),
    ('saved_passages', 'User-saved passages'),
    ('contact_messages', 'Support/contact messages'),
    ('admin_actions', 'Admin action history'),
    ('audit_events', 'Audit trail'),
    ('sessions', 'Legacy app sessions; presence is not proof of active use'),
    ('reset_tokens', 'Legacy app reset tokens; presence is not proof of active use')
)
SELECT e.table_name, e.purpose,
       CASE WHEN t.table_name IS NULL THEN 'MISSING' ELSE 'present' END AS status
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = e.table_name
ORDER BY e.table_name;

-- Check key columns used by current application code.
WITH expected(table_name, column_name, purpose) AS (
  VALUES
    ('users', 'id', 'Application user primary key'),
    ('users', 'email', 'Account email'),
    ('users', 'role', 'Application authorization role'),
    ('users', 'neon_auth_user_id', 'Neon Auth identity mapping'),
    ('subscriptions', 'user_id', 'Subscription owner'),
    ('subscriptions', 'plan', 'Subscription plan'),
    ('subscriptions', 'status', 'Subscription state'),
    ('subscriptions', 'ends_at', 'Subscription expiry'),
    ('payments', 'order_id', 'Cashfree order identifier'),
    ('payments', 'payment_id', 'Cashfree payment identifier'),
    ('payments', 'amount_paise', 'Expected amount in paise'),
    ('payments', 'status', 'Payment state'),
    ('payments', 'plan_id', 'Purchased plan'),
    ('payments', 'payment_session_id', 'Cashfree checkout session'),
    ('exam_templates', 'slug', 'Simulator identifier'),
    ('exam_templates', 'is_active', 'Simulator visibility'),
    ('passages', 'language', 'Passage language'),
    ('passages', 'body', 'Passage text'),
    ('results', 'user_id', 'Result owner'),
    ('results', 'net_wpm', 'Net typing speed')
)
SELECT e.table_name, e.column_name, e.purpose,
       CASE WHEN c.column_name IS NULL THEN 'MISSING' ELSE 'present' END AS status
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = e.column_name
ORDER BY e.table_name, e.column_name;

-- Show Neon Auth's table names only. An empty result can mean Auth is disabled,
-- the wrong database/branch is selected, or schema visibility is restricted.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'neon_auth'
ORDER BY table_name;

-- List likely migration bookkeeping tables, if any. This repository has SQL
-- migrations in db/migrations; do not infer execution from files existing in Git.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'neon_auth')
  AND (table_name ILIKE '%migration%' OR table_name ILIKE '%drizzle%')
ORDER BY table_schema, table_name;
