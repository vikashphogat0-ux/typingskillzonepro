-- Fresh Neon Auth cutover. Run once against the existing Neon database.
-- This intentionally invalidates legacy application sessions and resets old
-- application roles. It does NOT delete users, results, subscriptions,
-- payments, institute records, or passage/test history.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS neon_auth_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_neon_auth_user_id_uidx
  ON users (neon_auth_user_id)
  WHERE neon_auth_user_id IS NOT NULL;

-- Disable all sessions issued by the previous in-app password system.
DELETE FROM sessions;
DELETE FROM reset_tokens;

-- Old admin privileges must be explicitly re-granted to a newly authenticated
-- Neon Auth identity after cutover.
UPDATE users SET role = 'student' WHERE role <> 'student';

COMMIT;
