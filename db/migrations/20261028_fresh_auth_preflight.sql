-- READ-ONLY preflight for db/migrations/20261028_fresh_auth_institute_reset.sql.
-- Run against the exact intended database and save the output with the backup
-- record. This script does not modify data.
SELECT current_database() AS database_name, current_user AS database_role, now() AS checked_at;

SELECT 'users' AS table_name, count(*)::bigint AS row_count FROM users
UNION ALL SELECT 'sessions', count(*) FROM sessions
UNION ALL SELECT 'reset_tokens', count(*) FROM reset_tokens
UNION ALL SELECT 'tests', count(*) FROM tests
UNION ALL SELECT 'results', count(*) FROM results
UNION ALL SELECT 'saved_passages', count(*) FROM saved_passages
UNION ALL SELECT 'subscriptions', count(*) FROM subscriptions
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'institutions', count(*) FROM institutions
UNION ALL SELECT 'institution_members', count(*) FROM institution_members
UNION ALL SELECT 'batches', count(*) FROM batches
UNION ALL SELECT 'batch_members', count(*) FROM batch_members
UNION ALL SELECT 'assignments', count(*) FROM assignments
UNION ALL SELECT 'institute_subscriptions', count(*) FROM institute_subscriptions
UNION ALL SELECT 'add_on_purchases', count(*) FROM add_on_purchases
UNION ALL SELECT 'admin_actions', count(*) FROM admin_actions
UNION ALL SELECT 'audit_events', count(*) FROM audit_events
UNION ALL SELECT 'exam_templates', count(*) FROM exam_templates
UNION ALL SELECT 'passages', count(*) FROM passages
UNION ALL SELECT 'contact_messages', count(*) FROM contact_messages
ORDER BY table_name;
