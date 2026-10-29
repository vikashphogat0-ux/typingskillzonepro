-- Additive, non-destructive seed for the Delhi High Court JJA/Restorer 2026 English typing simulator.
-- Does not reset or alter existing templates. Canonical rules are also enforced in the application routes.
INSERT INTO exam_templates (
  slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active
) VALUES (
  'delhi-high-court-jja-en',
  'Delhi High Court JJA/Restorer 2026 — English',
  'en',
  600,
  'offscreen',
  'full',
  '{
    "id": "delhi-high-court-jja-en",
    "label": "Delhi High Court JJA/Restorer 2026 (English)",
    "unit": "words",
    "charsPerWord": 5,
    "fullErrorWeight": 1,
    "halfErrorWeight": 0,
    "halfRules": {"caseOnly": false, "punctuationOnly": false},
    "netMethod": "penalty",
    "qualificationBasis": "gross",
    "qualifyingWpm": 35,
    "maxErrorPercent": 3,
    "durationSec": 600,
    "errorPercentBasis": "referenceWords"
  }'::jsonb,
  'Practice profile based on the Delhi High Court JJA/Restorer 2026 notice. Qualifying speed is 35 WPM; configured error cap is a simulator approximation. Verify exact evaluation and rounding rules in the official notice.',
  true
)
ON CONFLICT (slug) DO NOTHING;
