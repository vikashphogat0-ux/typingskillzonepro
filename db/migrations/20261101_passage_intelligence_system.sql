-- TypingSkillZone Passage Intelligence System
-- Additive only: preserves all existing passages, test history, users and exam templates.
-- Run manually after reviewing the SQL. No destructive statements are used.

CREATE TABLE IF NOT EXISTS passage_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_key uuid UNIQUE,
  title text NOT NULL,
  language text NOT NULL CHECK (language IN ('en', 'hi')),
  body text NOT NULL,
  word_count integer NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  source_type text NOT NULL DEFAULT 'manual',
  source_filename text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS passage_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES passage_sources(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  title text NOT NULL,
  language text NOT NULL CHECK (language IN ('en', 'hi')),
  body text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  changed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, version)
);

CREATE TABLE IF NOT EXISTS passage_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES passage_sources(id) ON DELETE RESTRICT,
  template_id uuid NOT NULL REFERENCES exam_templates(id) ON DELETE RESTRICT,
  passage_id uuid REFERENCES passages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'failed', 'archived')),
  published_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  UNIQUE (source_id, template_id)
);

CREATE INDEX IF NOT EXISTS passage_sources_language_created_idx
  ON passage_sources (language, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS passage_distributions_template_status_idx
  ON passage_distributions (template_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS passage_distributions_passage_idx
  ON passage_distributions (passage_id);

-- Presentation-only controls. Exam duration, scoring and keyboard policies remain separate.
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS passage_font_family text NOT NULL DEFAULT 'system';
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS passage_alignment text NOT NULL DEFAULT 'left';
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS passage_line_spacing numeric(3,2) NOT NULL DEFAULT 1.50;
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS passage_paragraph_spacing numeric(4,1) NOT NULL DEFAULT 8;
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS print_page_size text NOT NULL DEFAULT 'A4';

-- Safe backfill: existing passage rows become independent source records and retain their current IDs.
-- This does not modify or delete the existing passage rows.
INSERT INTO passage_sources (title, language, body, word_count, source_type, created_at, updated_at)
SELECT DISTINCT ON (COALESCE(p.format_metadata->>'sourceTitle', p.title), p.language, p.body) COALESCE(p.format_metadata->>'sourceTitle', p.title), p.language, p.body, p.word_count, 'legacy-import', p.created_at, p.created_at
FROM passages p
WHERE NOT EXISTS (
  SELECT 1 FROM passage_distributions d WHERE d.passage_id = p.id
)
AND NOT EXISTS (
  SELECT 1 FROM passage_sources s
  WHERE s.title = p.title AND s.language = p.language AND s.body = p.body
    AND s.source_type = 'legacy-import'
)
ORDER BY COALESCE(p.format_metadata->>'sourceTitle', p.title), p.language, p.body, p.created_at;

-- Link each legacy passage to its matching source and simulator.
INSERT INTO passage_distributions (source_id, template_id, passage_id, status, published_at)
SELECT DISTINCT ON (p.id) s.id, p.template_id, p.id, 'published', p.created_at
FROM passages p
JOIN passage_sources s
  ON s.title = COALESCE(p.format_metadata->>'sourceTitle', p.title) AND s.language = p.language AND s.body = p.body
 AND s.source_type = 'legacy-import'
WHERE p.template_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM passage_distributions d WHERE d.passage_id = p.id)
ORDER BY p.id, s.created_at
ON CONFLICT (source_id, template_id) DO UPDATE
  SET passage_id = COALESCE(passage_distributions.passage_id, EXCLUDED.passage_id);

-- Establish initial display-only layouts. Administrators can subsequently tune each profile.
UPDATE exam_templates SET passage_layout = 'continuous' WHERE slug LIKE 'bsf-hcm-%' OR slug LIKE 'crpf-hcm-%';
UPDATE exam_templates SET passage_layout = 'paragraph-tab' WHERE slug LIKE 'dp-hcm-%' OR slug LIKE 'delhi-police-hcm-%';
UPDATE exam_templates SET passage_layout = 'source-preserved'
WHERE passage_layout IS NULL OR passage_layout = 'continuous'
  AND slug NOT LIKE 'bsf-hcm-%' AND slug NOT LIKE 'crpf-hcm-%';
