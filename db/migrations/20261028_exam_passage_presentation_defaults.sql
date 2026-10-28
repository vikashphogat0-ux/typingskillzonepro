-- Configure presentation only; do not change exam duration, scoring, passage content, or keyboard policy unless specified.
UPDATE exam_templates
SET font_size_pt = 12,
    passage_layout = CASE
      WHEN slug LIKE '%bsf%' THEN 'continuous'
      WHEN slug LIKE '%dp-hcm%' OR slug LIKE '%delhi-police%' THEN 'paper-to-screen'
      ELSE 'paragraphs'
    END,
    enter_key_policy = 'newline',
    tab_key_policy = 'blocked'
WHERE slug LIKE '%bsf%' OR slug LIKE '%dp-hcm%' OR slug LIKE '%delhi-police%';

-- All templates retain a 12 pt default. Admins can later tune verified official formats individually.
