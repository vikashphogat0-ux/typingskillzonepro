-- Additive daily passage automation metadata. Safe to run more than once; does not delete or overwrite existing passages.
ALTER TABLE passages ADD COLUMN IF NOT EXISTS generation_date date;
ALTER TABLE passages ADD COLUMN IF NOT EXISTS generation_slot text;
ALTER TABLE passages ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE passages ADD COLUMN IF NOT EXISTS format_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS font_size_pt integer NOT NULL DEFAULT 12;
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS passage_layout text NOT NULL DEFAULT 'continuous';
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS enter_key_policy text NOT NULL DEFAULT 'newline';
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS tab_key_policy text NOT NULL DEFAULT 'blocked';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_templates_font_size_pt_check') THEN
    ALTER TABLE exam_templates ADD CONSTRAINT exam_templates_font_size_pt_check CHECK (font_size_pt BETWEEN 8 AND 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_templates_passage_layout_check') THEN
    ALTER TABLE exam_templates ADD CONSTRAINT exam_templates_passage_layout_check CHECK (passage_layout IN ('continuous','paragraphs','paper-to-screen','structured'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_templates_enter_key_policy_check') THEN
    ALTER TABLE exam_templates ADD CONSTRAINT exam_templates_enter_key_policy_check CHECK (enter_key_policy IN ('newline','submit','blocked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_templates_tab_key_policy_check') THEN
    ALTER TABLE exam_templates ADD CONSTRAINT exam_templates_tab_key_policy_check CHECK (tab_key_policy IN ('insert-tab','focus-next','blocked'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS passage_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('morning','afternoon','live')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  requested_count integer NOT NULL,
  generated_count integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (generation_date, slot)
);
CREATE INDEX IF NOT EXISTS passages_generation_idx ON passages(generation_date, generation_slot);
