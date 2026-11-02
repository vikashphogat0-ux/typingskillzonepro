-- Additive institute invitations and billing notification idempotency.
-- Safe to apply to an existing database; no user, subscription, or payment rows are deleted.
BEGIN;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS institute_id uuid REFERENCES institutions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS payments_institute_idx ON payments(institute_id);

CREATE TABLE IF NOT EXISTS institute_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS institute_invitations_email_idx
  ON institute_invitations(lower(email), expires_at) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS institute_invitations_institute_idx
  ON institute_invitations(institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS institute_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_subscription_id uuid NOT NULL REFERENCES institute_subscriptions(id) ON DELETE CASCADE,
  notification_key text NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institute_subscription_id, notification_key)
);
CREATE INDEX IF NOT EXISTS institute_notification_log_sent_idx
  ON institute_notification_log(sent_at DESC);

COMMIT;
