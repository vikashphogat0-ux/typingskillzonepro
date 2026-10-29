-- Configure presentation only; do not change exam duration, scoring, or passage content.
-- Defaults apply to every existing template, then selected families get explicit overrides.
UPDATE exam_templates
SET font_size_pt = 12,
    passage_layout = CASE WHEN display_mode = 'offscreen' THEN 'paper-to-screen' ELSE 'paragraphs' END,
    enter_key_policy = 'newline',
    tab_key_policy = 'blocked';

UPDATE exam_templates
SET passage_layout = 'continuous',
    font_size_pt = 12
WHERE slug LIKE '%bsf%';

UPDATE exam_templates
SET passage_layout = 'paper-to-screen',
    font_size_pt = 12
WHERE slug LIKE '%dp-hcm%' OR slug LIKE '%delhi-police%';
