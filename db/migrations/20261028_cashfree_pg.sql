-- Cashfree PG order tracking and payment-schema alignment.
-- PRECONDITION: apply the corrected db/schema.sql to the intended application
-- database first. This migration does not create the rest of the app schema.
-- Safe to re-run; it does not delete users, subscriptions, or payment history.
BEGIN;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'cashfree';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_session_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_event_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Cashfree order creation happens before payment completion, so payment_id is
-- intentionally NULL while an order is pending. Keep legacy payment rows.
ALTER TABLE payments ALTER COLUMN payment_id DROP NOT NULL;

-- The previous Razorpay schema used period NOT NULL. New Cashfree plans use
-- plan_id from the central pricing catalog; old period data is retained.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'payments'
      AND column_name = 'period'
  ) THEN
    EXECUTE 'ALTER TABLE payments ALTER COLUMN period DROP NOT NULL';
  END IF;
END $$;

-- Normalize the legacy "created" state and align status checks with the
-- payment lifecycle used by the application. Only status-related checks are
-- removed; unrelated constraints remain intact.
DO $$
DECLARE constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

UPDATE payments SET status = 'pending' WHERE status = 'created';
UPDATE payments SET provider = 'razorpay' WHERE provider IS NULL OR provider = '';

ALTER TABLE payments ALTER COLUMN provider SET DEFAULT 'cashfree';
ALTER TABLE payments ADD CONSTRAINT payments_status_cashfree_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded'));

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx
  ON payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_provider_status_idx
  ON payments(provider, status);
CREATE INDEX IF NOT EXISTS payments_user_idx
  ON payments(user_id);

COMMIT;
