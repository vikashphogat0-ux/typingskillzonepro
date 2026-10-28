-- Non-destructive Neon Auth identity-linking prerequisite for Typing Skill Zone.
-- Run only after confirming the intended production Neon branch with the read-only
-- preflight in db/diagnostics/production-readonly-audit.sql.
-- Safe to re-run. Does not delete sessions, reset roles, or alter institute records.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS neon_auth_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_neon_auth_user_id_uidx
  ON public.users (neon_auth_user_id)
  WHERE neon_auth_user_id IS NOT NULL;

COMMIT;
