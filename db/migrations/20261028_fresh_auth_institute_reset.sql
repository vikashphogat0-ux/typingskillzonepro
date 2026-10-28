-- Fresh account + institute reset for Neon Auth.
-- REVIEW BEFORE RUNNING: destructive for account-linked operational data.
-- This migration is intentionally NOT run automatically by the app or deployment.
--
-- DELETES:
--   all application users and legacy password hashes; sessions/reset tokens;
--   user test attempts/results; personal saved passages; subscriptions;
--   payment rows; institute records, memberships, batches, assignments,
--   institute subscriptions/add-ons; admin action and audit history.
--
-- PRESERVES:
--   exam templates, passage content (created_by is anonymized to NULL),
--   contact/support messages, schema, and database/provider configuration.
--
-- IMPORTANT: this SQL does not delete identities stored separately by the
-- Neon Auth service. Use its supported management interface if those must go.
-- Execute only after a verified backup and explicit production approval.
BEGIN;

-- Add Neon identity mapping before any new account is created.
ALTER TABLE users ADD COLUMN IF NOT EXISTS neon_auth_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_neon_auth_user_id_uidx
  ON users (neon_auth_user_id)
  WHERE neon_auth_user_id IS NOT NULL;

-- Delete institute roots first because institutions.owner_id may have a
-- NO ACTION foreign key. Their child rows are removed explicitly below.
DELETE FROM institute_subscriptions;
DELETE FROM add_on_purchases;
DELETE FROM assignments;
DELETE FROM batch_members;
DELETE FROM batches;
DELETE FROM institution_members;
DELETE FROM institutions;

-- Remove account-linked history. This is intentionally destructive, including
-- payment rows; revise this scope if payment/audit retention is required.
DELETE FROM admin_actions;
DELETE FROM audit_events;
DELETE FROM saved_passages;
DELETE FROM results;
DELETE FROM tests;
DELETE FROM subscriptions;
DELETE FROM payments;
DELETE FROM sessions;
DELETE FROM reset_tokens;

-- Passage content is shared product content and is preserved; only remove
-- the reference to an account that is about to be deleted.
UPDATE passages SET created_by = NULL WHERE created_by IS NOT NULL;

-- Finally remove every old application account, including legacy password
-- hashes, provider IDs and all prior application roles.
DELETE FROM users;

COMMIT;
