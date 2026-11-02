# Official exam-rule audit — complete simulator directory

This audit applies to **every exam simulator in `lib/presets.ts`**, not only Delhi Police HCM.

## Governing rule

A simulator may be called “official-pattern verified” only when its configuration is traceable to the exact current recruitment notification, corrigendum and/or official typing-test instructions for that post and recruitment cycle. A generic pattern shared by similar posts is not sufficient proof.

For each simulator, audit and record:

1. Recruitment authority, exact post, recruitment cycle and official source URL/page/paragraph.
2. Test stage and whether typing is qualifying, merit-bearing or used for marks.
3. Language and permitted keyboard/font/input method.
4. Duration, minimum/target speed, passage length or key-depression target.
5. Gross/net/actual speed formula and denominator.
6. Error allowance, error categories, penalty, rounding and disqualification rules.
7. Passage delivery (printed/on-screen), formatting, paragraph and tab requirements.
8. Keyboard restrictions only where an official instruction explicitly states them.
9. Separate stages (DEST, computer proficiency, formatting, skill test, shorthand) and their timing/marks.
10. Corrigenda, exemptions, compensatory time and post/category-specific variations.

Unknown or unsupported details must be labelled **Not specified in source** or **Needs exact post/cycle notification**. Do not invent defaults and call them official. Practice-only behavior must be clearly labelled.

## Simulator directory — full scope

The current built-in directory contains 28 entries:

| Family | Simulator slugs | Audit treatment |
|---|---|---|
| SSC CHSL LDC/JSA | `ssc-chsl-en`, `ssc-chsl-hi` | Separate English/Hindi typing profiles; verify current CHSL notice and SSC evaluation instructions. |
| SSC CGL DEO / DEST | `ssc-cgl-deo` | Verify DEO grade/post-specific KDPH, duration, passage size and evaluation. Do not use a single DEST target for all DEO posts. |
| SSC CGL LDC / Tax Assistant | `ssc-cgl-ldc-en` | Verify exact post and recruitment notice; do not inherit CHSL rules automatically. |
| RRB NTPC CBTST | `rrb-ntpc-en`, `rrb-ntpc-hi` | Verify current CEN and corrigenda; confirm qualifying status, 30/25 WPM, input/font rules and any warm-up procedure only if officially documented. |
| Delhi Police HCM | `dp-hcm-en`, `dp-hcm-hi` | Use the exact Delhi Police HCM recruitment cycle; separate typing test and computer formatting test. |
| Delhi High Court JJA/Restorer | `delhi-high-court-jja-en` | Use the exact JJA/Restorer recruitment notice and any later test instructions. |
| BSF HCM | `bsf-hcm-en`, `bsf-hcm-hi` | Verify BSF recruitment notice and trade/typing instructions; do not infer keyboard restrictions from CAPF similarity. |
| CRPF HCM | `crpf-hcm-en`, `crpf-hcm-hi` | Verify CRPF-specific notice, typing test procedure and mistake formula. |
| CISF HCM | `cisf-hcm-en`, `cisf-hcm-hi` | Verify CISF-specific notice; do not copy CRPF/BSF settings without source evidence. |
| DSSSB LDC | `dsssb-ldc-en`, `dsssb-ldc-hi` | Exact post code and department matter; audit the relevant DSSSB advertisement and skill-test instructions. |
| High Court Clerk | `hc-clerk-en`, `hc-clerk-hi` | Generic family only. Must select a specific High Court, post and recruitment cycle before official verification. |
| District Court Clerk | `district-court-en`, `district-court-hi` | Generic family only. Must select state/district, post and recruitment cycle before official verification. |
| UPSSSC / UP Courts LDC | `upssc-ldc-hi`, `upsssc-hi` | Resolve the authority/post ambiguity and verify the exact advertisement and typing instructions. |
| Rajasthan LDC | `rsmssb-ldc-hi`, `rsmssb-ldc-en` | Verify the relevant RSSB/RSMSSB recruitment cycle, typing test and computer proficiency rules. |
| IBPS DEST | `ibps-dest` | Verify exact IBPS CRP, participating post/bank, KDPH, duration, error policy and qualifying status. |
| General practice | `practice-1min`, `practice-5min-hi` | Not an official recruitment simulator; configurable practice only, with no official pass/fail claim. |

## Official primary sources discovered for the audit

- [SSC CHSL 2025 official notice](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2025.pdf) — includes separate DEO skill-test variants and LDC/JSA typing requirements.
- [RRB NTPC Undergraduate CEN 07/2025 official notice](https://www.rrbcdg.gov.in/uploads/2025/07-NTPCUG/072025NTPCUG-CEN.pdf) — CBTST section sets qualifying status, English/Hindi speeds and computer restrictions.
- [Delhi High Court JJA/Restorer 2026 vacancy notice](https://delhihighcourt.nic.in/web/vacancy-notice-junior-judicial-assistantrestorer-open-examination-2026) — exact recruitment-cycle source; inspect its attached PDF and later test instructions before finalizing rules.
- [DSSSB official typing-test instructions, Post Code 802/23](https://dsssb.delhi.gov.in/dsssb/general-instructions-candidates-typing-skill-test-various-posts-grade-ivjunior-0) — demonstrates why post-code-specific instructions are required.
- [RSSB official archive](https://rsmssb.rajasthan.gov.in/show_archived?menuName=ApBuI6wdvnNKC6MoOgFsfXwFRsE7cKLr&theme=Red) — includes Clerk Grade-II / Junior Assistant 2024 typing-test instructions.
- [SSC Selection Post skill-test instructions (2025)](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/NOTICE_24072025.pdf) — relevant only to the Selection Post skill tests covered by that instruction; do not generalize to all SSC exams.

## Current implementation status

This file establishes the complete audit scope and source discipline. It does **not** claim that all 28 directory entries have been verified. Each family must be researched against its exact current official notice before its scoring profile, duration, passage length, keyboard rules or labels are changed.

The next code changes should be made in small exam-family batches, with:
- a source-backed rule specification,
- a machine-readable profile/configuration update,
- scoring and keyboard regression tests,
- visible “officially verified / provisional / practice only” status,
- CI passing before the next family is changed.

Never modify production database contents or run migrations as part of a rule audit without separate explicit authorization.
