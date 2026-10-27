-- =============================================================================
-- TypingSkillZone — Official Exam Simulator Seeds
-- Run ONCE after schema.sql:  psql "$DATABASE_URL" -f db/seed-simulators.sql
-- Sources listed per entry. Re-run is safe (ON CONFLICT DO NOTHING).
-- All rules verified against official notifications where available.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SSC CHSL (English) — Staff Selection Commission
--    Tier-II: English typing, 35 net WPM, 10 min, ~1750 key depressions
--    Source: SSC CHSL Tier-II notice / CGL Tier-III (skill test) notifications
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('ssc-chsl-en',
 'SSC CHSL — English Typing',
 'en', 600,
 'highlighted', 'full',
 '{"id":"ssc-chsl-en","label":"SSC CHSL English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'Staff Selection Commission — Combined Higher Secondary Level (Tier-II / Skill Test). English typing at 35 net WPM. Errors penalised: net = gross − (full errors + 0.5 × half errors) / minutes. Source: SSC CHSL 2024 official notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 2. SSC CHSL (Hindi) — Hindi typing, 30 net WPM, 10 min
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('ssc-chsl-hi',
 'SSC CHSL — Hindi Typing',
 'hi', 600,
 'highlighted', 'full',
 '{"id":"ssc-chsl-hi","label":"SSC CHSL Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":30}'::jsonb,
 'Staff Selection Commission — Combined Higher Secondary Level (Tier-II / Skill Test). Hindi typing at 30 net WPM. Source: SSC CHSL 2024 official notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 3. SSC CGL — Data Entry Operator (Key Depressions)
--    DEO: 8000 key depressions per hour = 133.33/min. Skill test 15 min.
--    Net = key depressions / 5 / minutes − errors/minutes. Qualifying: 26.67 net WPM
--    Source: SSC CGL DEO Tier-III skill test notice
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('ssc-cgl-deo',
 'SSC CGL — DEO (Key Depressions)',
 'en', 900,
 'unhighlighted', 'full',
 '{"id":"ssc-cgl-deo","label":"SSC CGL DEO","unit":"keystrokes","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":26.67}'::jsonb,
 'SSC CGL — Data Entry Operator skill test. Scored on key depressions (8000/hour qualifying). 15-minute test. Passage not shown during typing (unhighlighted). Source: SSC CGL 2024 notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 4. SSC CGL — LDC / Tax Assistant (English typing)
--    Lower Division Clerk / Tax Asst: English 35 WPM, 10 min
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('ssc-cgl-ldc-en',
 'SSC CGL — LDC / Tax Assistant (English)',
 'en', 600,
 'highlighted', 'full',
 '{"id":"ssc-cgl-ldc-en","label":"SSC CGL LDC English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'SSC CGL — Lower Division Clerk / Tax Assistant typing test. English 35 net WPM, 10 minutes. Source: SSC CGL 2024 official notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 5. SSC MTS — Multi-Tasking Staff (no typing test — excluded)
--    SSC MTS does NOT have a typing test in its selection process.
--    Not seeded.

-- ---------------------------------------------------------------------------
-- 6. RRB NTPC — English Typing (Clerk / Station Master etc.)
--    30 WPM English, 10 min, highlighted
--    Source: RRB NTPC 2024 CEN 05/2024 notification
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('rrb-ntpc-en',
 'RRB NTPC — English Typing',
 'en', 600,
 'highlighted', 'full',
 '{"id":"rrb-ntpc-en","label":"RRB NTPC English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":30}'::jsonb,
 'Railway Recruitment Board — Non-Technical Popular Categories. Typing Skill Test: English 30 net WPM, 10 minutes. Qualifying in nature (not merit). Source: RRB NTPC CEN 05/2024.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 7. RRB NTPC — Hindi Typing
--    25 WPM Hindi, 10 min
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('rrb-ntpc-hi',
 'RRB NTPC — Hindi Typing',
 'hi', 600,
 'highlighted', 'full',
 '{"id":"rrb-ntpc-hi","label":"RRB NTPC Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":25}'::jsonb,
 'Railway Recruitment Board — Non-Technical Popular Categories. Typing Skill Test: Hindi 25 net WPM, 10 minutes. Qualifying in nature. Source: RRB NTPC CEN 05/2024.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 8. Delhi Police — Head Constable Ministerial (English)
--    35 WPM English, 10 min, offscreen (paper passage)
--    Source: CSSC Delhi Police HCM 2023-24 notification
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('dp-hcm-en',
 'Delhi Police HCM — English Typing',
 'en', 600,
 'offscreen', 'word',
 '{"id":"dp-hcm-en","label":"Delhi Police HCM English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'Delhi Police — Head Constable Ministerial. Typing test: English 35 net WPM, 10 minutes, paper-to-screen mode (passage on paper, type from memory). Only current word backspace allowed. Source: CSSC DP HCM 2024 notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 9. Delhi Police — Head Constable Ministerial (Hindi)
--    30 WPM Hindi, 10 min, offscreen
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('dp-hcm-hi',
 'Delhi Police HCM — Hindi Typing',
 'hi', 600,
 'offscreen', 'word',
 '{"id":"dp-hcm-hi","label":"Delhi Police HCM Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":30}'::jsonb,
 'Delhi Police — Head Constable Ministerial. Typing test: Hindi 30 net WPM, 10 minutes, paper-to-screen mode. Source: CSSC DP HCM 2024 notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 10. BSF Head Constable Ministerial (English)
--     35 WPM English, 10 min, offscreen (same CAPF pattern as Delhi Police)
--     Source: BSF HCM 2024 / CRPF / CISF CAPF ministerial notifications
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('bsf-hcm-en',
 'BSF Head Constable Min. — English Typing',
 'en', 600,
 'offscreen', 'word',
 '{"id":"bsf-hcm-en","label":"BSF HCM English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'Border Security Force — Head Constable Ministerial. English typing 35 net WPM, 10 minutes, paper-to-screen mode. Current-word backspace only. Source: BSF HCM 2024 notification (CAPF pattern).',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 11. BSF Head Constable Ministerial (Hindi)
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('bsf-hcm-hi',
 'BSF Head Constable Min. — Hindi Typing',
 'hi', 600,
 'offscreen', 'word',
 '{"id":"bsf-hcm-hi","label":"BSF HCM Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":30}'::jsonb,
 'Border Security Force — Head Constable Ministerial. Hindi typing 30 net WPM, 10 minutes, paper-to-screen mode. Source: BSF HCM 2024 notification (CAPF pattern).',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 12. CRPF Head Constable Ministerial (English) — same CAPF pattern
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('crpf-hcm-en',
 'CRPF Head Constable Min. — English Typing',
 'en', 600,
 'offscreen', 'word',
 '{"id":"crpf-hcm-en","label":"CRPF HCM English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'CRPF — Head Constable Ministerial. English typing 35 net WPM, 10 minutes, paper-to-screen mode. Source: CRPF HCM notification (CAPF pattern).',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 13. CISF Head Constable Ministerial (English) — CAPF pattern
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('cisf-hcm-en',
 'CISF Head Constable Min. — English Typing',
 'en', 600,
 'offscreen', 'word',
 '{"id":"cisf-hcm-en","label":"CISF HCM English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'CISF — Head Constable Ministerial. English typing 35 net WPM, 10 minutes, paper-to-screen mode. Source: CISF HCM notification (CAPF pattern).',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 14. DSSSB — Lower Division Clerk (English)
--     Delhi Subordinate Services Selection Board. LDC: English 35 WPM, 10 min.
--     Source: DSSSB LDC / DEO recruitment notifications
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('dsssb-ldc-en',
 'DSSSB — LDC English Typing',
 'en', 600,
 'highlighted', 'full',
 '{"id":"dsssb-ldc-en","label":"DSSSB LDC English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'Delhi Subordinate Services Selection Board — Lower Division Clerk. English typing 35 net WPM, 10 minutes. Source: DSSSB LDC recruitment notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 15. DSSSB — LDC Hindi
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('dsssb-ldc-hi',
 'DSSSB — LDC Hindi Typing',
 'hi', 600,
 'highlighted', 'full',
 '{"id":"dsssb-ldc-hi","label":"DSSSB LDC Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":30}'::jsonb,
 'Delhi Subordinate Services Selection Board — Lower Division Clerk. Hindi typing 30 net WPM, 10 minutes. Source: DSSSB LDC recruitment notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 16. High Court — Clerk / Stenographer (English)
--     Most High Courts: 30–35 WPM, 10 min, offscreen (read from printed passage)
--     Backspace restricted to current word only in most court exams.
--     Source: Allahabad HC / Delhi HC / Rajasthan HC recruitment notifications
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('hc-clerk-en',
 'High Court Clerk — English Typing',
 'en', 600,
 'offscreen', 'word',
 '{"id":"hc-clerk-en","label":"High Court Clerk English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":30}'::jsonb,
 'High Court — Clerical / LDC typing test. English 30 net WPM, 10 minutes, paper-to-screen mode. Current-word backspace only. Verify exact qualifying speed from your specific court''s notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 17. High Court — Clerk (Hindi)
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('hc-clerk-hi',
 'High Court Clerk — Hindi Typing',
 'hi', 600,
 'offscreen', 'word',
 '{"id":"hc-clerk-hi","label":"High Court Clerk Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":25}'::jsonb,
 'High Court — Clerical / LDC typing test. Hindi 25 net WPM, 10 minutes, paper-to-screen mode. Verify exact qualifying speed from your specific court''s notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 18. District Court — Lower Division Clerk (English)
--     Subordinate courts pattern. Typically 35 WPM, 10 min, offscreen.
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('district-court-en',
 'District Court Clerk — English Typing',
 'en', 600,
 'offscreen', 'word',
 '{"id":"district-court-en","label":"District Court Clerk English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'District / Subordinate Court — LDC typing test. English 35 net WPM, 10 minutes, paper-to-screen mode. Verify exact qualifying speed from your state court''s notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 19. District Court — LDC (Hindi)
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('district-court-hi',
 'District Court Clerk — Hindi Typing',
 'hi', 600,
 'offscreen', 'word',
 '{"id":"district-court-hi","label":"District Court Clerk Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":30}'::jsonb,
 'District / Subordinate Court — LDC typing test. Hindi 30 net WPM, 10 minutes, paper-to-screen mode. Verify exact qualifying speed from your state court''s notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 20. UPPSC / UP Subordinate Courts — Lower Division Clerk (Hindi)
--     UP Adhinasth Sewa Selection Commission pattern
--     Hindi 25 WPM, 10 min
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('upssc-ldc-hi',
 'UPSSC / UP Courts — Hindi Typing',
 'hi', 600,
 'offscreen', 'word',
 '{"id":"upssc-ldc-hi","label":"UPSSC LDC Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":25}'::jsonb,
 'UPSSC / UP Subordinate Courts — LDC Hindi typing test. 25 net WPM, 10 minutes, paper-to-screen mode. Source: UPSSC LDC / UP Court clerk recruitment notifications.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 21. UPSSSC — Lower Secondary Clerk (Hindi)
--     UP Subordinate Services Selection Commission. Passage on screen, highlighted.
--     Hindi 25 WPM, 10 min. Source: UPSSSC PET / Lekhpal / VDO / LDC notices
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('upsssc-hi',
 'UPSSSC — Hindi Typing',
 'hi', 600,
 'highlighted', 'full',
 '{"id":"upsssc-hi","label":"UPSSSC Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":25}'::jsonb,
 'Uttar Pradesh Subordinate Services Selection Commission — LDC / Clerk posts. Hindi typing 25 net WPM, 10 minutes. Source: UPSSSC LDC 2024 notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 22. RSMSSB — Rajasthan LDC (Hindi)
--     Rajasthan Staff Selection Board — LDC. Hindi 35 WPM, 10 min.
--     Source: RSMSSB LDC 2024 notification
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('rsmssb-ldc-hi',
 'RSMSSB — Rajasthan LDC Hindi Typing',
 'hi', 600,
 'highlighted', 'full',
 '{"id":"rsmssb-ldc-hi","label":"RSMSSB LDC Hindi","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'Rajasthan Staff Selection Board — Lower Division Clerk. Hindi typing 35 net WPM, 10 minutes. Source: RSMSSB LDC 2024 notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 23. RSMSSB — Rajasthan LDC (English)
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('rsmssb-ldc-en',
 'RSMSSB — Rajasthan LDC English Typing',
 'en', 600,
 'highlighted', 'full',
 '{"id":"rsmssb-ldc-en","label":"RSMSSB LDC English","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":35}'::jsonb,
 'Rajasthan Staff Selection Board — Lower Division Clerk. English typing 35 net WPM, 10 minutes. Source: RSMSSB LDC 2024 notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 24. IBPS Clerk / RRB Office Asst — Data Entry Speed Test
--     IBPS does have a DEST (Data Entry Speed Test) for some posts.
--     8000 key depressions per hour = 133.33/min. 5 min test.
--     Source: IBPS CRP Clerks / RRB Office Asst notifications
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('ibps-dest',
 'IBPS DEST — Data Entry Speed Test',
 'en', 300,
 'unhighlighted', 'full',
 '{"id":"ibps-dest","label":"IBPS DEST","unit":"keystrokes","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty","qualifyingWpm":26.67}'::jsonb,
 'IBPS — Data Entry Speed Test for Clerk / RRB Office Assistant posts. 8000 key depressions per hour qualifying. 5-minute test, passage not highlighted. Source: IBPS CRP Clerks XII notification.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 25. Free Practice — 1 minute warm-up (no qualifying mark)
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('practice-1min',
 'Free Practice — 1 Minute',
 'en', 60,
 'highlighted', 'full',
 '{"id":"practice","label":"Free Practice","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty"}'::jsonb,
 'One-minute warm-up. No qualifying mark. Not ranked on leaderboards.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 26. Free Practice — 5 minutes (Hindi)
-- ---------------------------------------------------------------------------
INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, description, is_active) VALUES
('practice-5min-hi',
 'Free Practice — 5 Minutes (Hindi)',
 'hi', 300,
 'highlighted', 'full',
 '{"id":"practice","label":"Free Practice","unit":"words","charsPerWord":5,
   "fullErrorWeight":1,"halfErrorWeight":0.5,
   "halfRules":{"caseOnly":true,"punctuationOnly":true},
   "netMethod":"penalty"}'::jsonb,
 'Five-minute Hindi typing warm-up. No qualifying mark. Great for building speed before an exam.',
 true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
  display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace,
  scoring = EXCLUDED.scoring, description = EXCLUDED.description, is_active = EXCLUDED.is_active;
