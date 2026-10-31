-- Additive simulator presentation settings.
-- Safe to re-run. Does not delete or rewrite exam, passage, user, or result data.
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS passage_layout text NOT NULL DEFAULT 'continuous';
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS enter_key_policy text NOT NULL DEFAULT 'newline';
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS tab_key_policy text NOT NULL DEFAULT 'blocked';
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS font_size_pt numeric(4,1) NOT NULL DEFAULT 12;
