-- TypingSkillZone schema (Postgres / Neon). Run once: psql "$DATABASE_URL" -f db/schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  name          text,
  role          text NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','seven_day','student_pro_monthly','student_pro_quarterly','student_pro_half_yearly','student_pro_annual')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  starts_at     timestamptz NOT NULL DEFAULT now(),
  ends_at       timestamptz,
  -- For institute subscriptions, user_id is the institute owner's id
  -- and plan refers to an institute plan id
  is_institute  boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id);

/* Institute plans table -- stores the authorized price catalog */
CREATE TABLE IF NOT EXISTS institute_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       text NOT NULL UNIQUE CHECK (plan_id IN ('institute_basic','institute_growth','institute_enterprise')),
  monthly_amount_paise int NOT NULL DEFAULT 0,
  annual_amount_paise int NOT NULL DEFAULT 0,
  max_student_seats int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

/* Promotions / coupons -- administrative discount catalog */
CREATE TABLE IF NOT EXISTS promotions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  discount_type     text NOT NULL CHECK (discount_type IN ('fixed_paise','percentage')),
  discount_value    int NOT NULL DEFAULT 0,
  eligible_plan_ids jsonb NOT NULL DEFAULT '[]'::jsonb, -- JSON array of plan ids
  eligible_institute_plan_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_date        timestamptz NOT NULL,
  expiry_date       timestamptz NOT NULL,
  max_redemptions   int,
  per_user_limit    int NOT NULL DEFAULT 0,
  minimum_purchase_paise int NOT NULL DEFAULT 0,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Admin-managed exam presets (SSC CGL, CHSL, RRB NTPC, High Court ...)
CREATE TABLE IF NOT EXISTS exam_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  language      text NOT NULL CHECK (language IN ('en','hi')),
  duration_sec  int  NOT NULL CHECK (duration_sec > 0),
  display_mode  text NOT NULL DEFAULT 'highlighted' CHECK (display_mode IN ('highlighted','unhighlighted','offscreen')),
  backspace     text NOT NULL DEFAULT 'full' CHECK (backspace IN ('full','word','disabled')),
  scoring       jsonb NOT NULL,          -- ScoringProfile, see lib/wpmCalculator.ts
  is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS passages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid REFERENCES exam_templates(id) ON DELETE SET NULL,
  language      text NOT NULL CHECK (language IN ('en','hi')),
  title         text NOT NULL,
  body          text NOT NULL,
  word_count    int  NOT NULL,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS passages_lang_idx ON passages(language, template_id);

CREATE TABLE IF NOT EXISTS tests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id   uuid REFERENCES exam_templates(id),
  passage_id    uuid REFERENCES passages(id),
  language      text NOT NULL,
  display_mode  text NOT NULL,
  backspace     text NOT NULL,
  duration_sec  int  NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS results (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id        uuid REFERENCES tests(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gross_wpm      numeric(6,2) NOT NULL,
  net_wpm        numeric(6,2) NOT NULL,
  accuracy       numeric(5,2) NOT NULL,
  full_errors    int NOT NULL,
  half_errors    int NOT NULL,
  fixed_errors   int NOT NULL,
  ignored_errors int NOT NULL,
  penalty_wpm    numeric(6,2) NOT NULL,
  passed         boolean,
  breakdown      jsonb NOT NULL,         -- full ScoreResult
  keystrokes     jsonb,                  -- compact KeyEvent[] for analytics
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS results_user_idx ON results(user_id, created_at DESC);

-- Cashfree payment indexes are created below after the canonical payments table.
CREATE INDEX IF NOT EXISTS tests_user_day_idx ON tests(user_id, started_at);

-- Link our users to the sign-in provider's user id (better-auth ids are strings, not uuids).
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS neon_auth_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_neon_auth_user_id_uidx ON users(neon_auth_user_id) WHERE neon_auth_user_id IS NOT NULL;

-- ===== Institutions, simulators, leaderboards (safe to re-run) =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true;
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS institutions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  city          text, state text, phone text, address text, contact_email text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended')),
  join_code     text UNIQUE NOT NULL,
  owner_id      uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

/* Institute subscriptions -- links an institute owner to a plan */
CREATE TABLE IF NOT EXISTS institute_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id      uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  plan_id           uuid NOT NULL REFERENCES institute_plans(id) ON DELETE RESTRICT,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at        timestamptz NOT NULL DEFAULT now(),
  ends_at           timestamptz,
  active_student_count int NOT NULL DEFAULT 0,
  renewed_at        timestamptz
);
CREATE INDEX IF NOT EXISTS institute_subs_institute_idx ON institute_subscriptions(institute_id);
CREATE INDEX IF NOT EXISTS institute_subs_plan_idx ON institute_subscriptions(plan_id);


/* Payment records -- stores verified payment details */
CREATE TABLE IF NOT EXISTS payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  institute_id      uuid REFERENCES institutions(id) ON DELETE SET NULL,
  order_id          text NOT NULL,
  payment_id        text,
  amount_paise      int NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'INR',
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  gateway_event_id  text,
  provider          text NOT NULL DEFAULT 'cashfree',
  plan_id           text,
  payment_session_id text,
  idempotency_key   text,
  customer_email    text,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz,
  verified_at       timestamptz,
  failure_reason    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id),
  UNIQUE (payment_id)
);


/* Add-on purchases -- additional capabilities for institutes */
CREATE TABLE IF NOT EXISTS add_on_purchases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchaser_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institute_id      uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  add_on_id         text NOT NULL CHECK (add_on_id IN ('additional_50_seats','additional_branch','custom_branding','white_label','setup_training')),
  amount_paise      int NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed')),
  valid_until       timestamptz,
  quantity          int NOT NULL DEFAULT 1,
  purchased_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institute_id, add_on_id)
);


/* Audit events -- records important billing and security events */
CREATE TABLE IF NOT EXISTS audit_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  institute_id      uuid REFERENCES institutions(id) ON DELETE SET NULL,
  action            text NOT NULL,
  target_type       text,
  target_id         uuid,
  details           jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- a person belongs to at most one institution
CREATE TABLE IF NOT EXISTS institution_members (
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role           text NOT NULL CHECK (role IN ('owner','teacher','student')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS institution_members_user_uidx ON institution_members(user_id);

CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS batch_members (
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, user_id)
);
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,   -- null = every student
  template_id uuid NOT NULL REFERENCES exam_templates(id) ON DELETE CASCADE,
  title text NOT NULL, due_at timestamptz,
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);

-- the server keeps the reference text, so scores and rankings cannot be faked from the browser
ALTER TABLE tests   ADD COLUMN IF NOT EXISTS reference_text text;
ALTER TABLE tests   ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES assignments(id) ON DELETE SET NULL;
ALTER TABLE tests   ADD COLUMN IF NOT EXISTS submitted boolean NOT NULL DEFAULT false;
ALTER TABLE results ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES exam_templates(id) ON DELETE SET NULL;
ALTER TABLE results ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES assignments(id) ON DELETE SET NULL;
ALTER TABLE results ADD COLUMN IF NOT EXISTS typed_text text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS reference_text text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS elapsed_sec numeric(7,2);
ALTER TABLE results ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS results_tpl_idx ON results(template_id, net_wpm DESC);
CREATE UNIQUE INDEX IF NOT EXISTS results_test_uidx ON results(test_id) WHERE test_id IS NOT NULL;

-- ===== Contact / support messages =====
CREATE TABLE IF NOT EXISTS contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  subject     text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ===== Saved / bookmarked passages =====
CREATE TABLE IF NOT EXISTS saved_passages (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  saved_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, passage_id)
);

-- ===== Admin usage tracking =====
CREATE TABLE IF NOT EXISTS admin_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES users(id),
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id    uuid,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- description column on exam_templates (may already exist)
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS description text;

-- ===== Custom auth (no external auth library) =====
-- Password hashes stored per-user (bcrypt via pgcrypto)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Server-side sessions (httpOnly cookie token → user_id)
CREATE TABLE IF NOT EXISTS sessions (
  token      char(64)    PRIMARY KEY,         -- 32 random bytes as hex
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

-- Password-reset one-time tokens (sent by email, expire in 1 hour)
CREATE TABLE IF NOT EXISTS reset_tokens (
  token      char(64)    PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  used       boolean     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS reset_tokens_user_idx ON reset_tokens(user_id);
