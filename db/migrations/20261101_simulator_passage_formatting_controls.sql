-- Add the remaining simulator passage presentation controls.
-- Additive and safe to re-run: preserves all existing exam, passage, user and result data.
ALTER TABLE exam_templates
  ADD COLUMN IF NOT EXISTS passage_font_family text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS passage_alignment text NOT NULL DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS passage_line_spacing numeric(3,1) NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS passage_paragraph_spacing numeric(4,1) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS print_page_size text NOT NULL DEFAULT 'A4';

-- Normalize legacy values written by earlier presentation defaults to the
-- currently supported editor values. Unknown values are left untouched.
UPDATE exam_templates
SET passage_layout = CASE passage_layout
  WHEN 'paragraphs' THEN 'paragraph-tab'
  WHEN 'paper-to-screen' THEN 'source-preserved'
  ELSE passage_layout
END
WHERE passage_layout IN ('paragraphs', 'paper-to-screen');
