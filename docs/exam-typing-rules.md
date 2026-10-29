# Typing exam rules and simulator profiles

This file records the source basis for the exam profiles in `lib/wpmCalculator.ts`. Always check the recruitment-cycle notification and any later skill-test instructions before treating a practice result as an official qualification result.

## Rules verified against official notifications

| Exam/profile | Current profile settings | Source and caveats |
|---|---|---|
| SSC CHSL LDC/JSA English | 10 minutes; 35 WPM | SSC CHSL 2025 notification says English 35 WPM, Hindi 30 WPM; the test is qualifying and evaluated under SSC's separate evaluation guidelines. This profile qualifies on gross speed; it does not claim to reproduce every SSC error-evaluation detail. |
| SSC CHSL LDC/JSA Hindi | 10 minutes; 30 WPM | Same SSC CHSL 2025 notification. |
| SSC CGL DEST | 15 minutes; 2,000 key-depression practice target | SSC CGL 2025 notification says DEST lasts 15 minutes and is qualifying. It also says higher standards may apply to certain posts. The 2,000 key-depression target is not a universal WPM pass threshold; post-specific evaluation must be checked. |
| RRB NTPC CBTST English | 10-minute evaluation; at least 300 words; 30 WPM | RRB CEN 05/2024 special instructions dated 22 Dec 2025. The 22 Dec 2025 instructions describe the 1-minute practice, break, 10-minute evaluation, 5% error allowance, and speed formula (total words typed − final mistakes × 10) ÷ time. A later 30 Dec 2025 RRB notice states that transcripts are evaluated whether or not the passage was completed; therefore the simulator does not automatically disqualify an incomplete transcript. Editing tools/spell check are not allowed. |
| RRB NTPC CBTST Hindi | 10-minute evaluation; at least 250 words; 25 WPM | Same RRB instructions. Hindi candidates should be familiar with Kruti Dev or Mangal. The session includes a 1-minute practice and a 1-minute break, which are not part of the 10-minute evaluated test (per the 24 Dec 2025 corrigendum). |
| Delhi Police Head Constable (Ministerial) English/Hindi | 10 minutes; English 30 WPM, Hindi 25 WPM; up to 25 marks | Delhi Police HCM 2025 notification: printed passage minimum 400 words/2,000 strokes in English or 350 words/1,750 strokes in Hindi; one word deducted per mistake; marks bands are implemented in the DP HCM profile. |
| Delhi High Court JJA/Restorer English | 10 minutes; 35 WPM; maximum 3% mistakes | Delhi High Court JJA/Restorer 2026 vacancy notice. Speed uses characters including spaces; the typing test is qualifying. The profile uses a 3% error cap as a simulator approximation; exact error-count rounding and evaluation should be checked against the notice/instructions. |

## Profiles intentionally not hard-coded as official rules

- **BSF Head Constable (Ministerial):** Available secondary pages report 35 WPM English / 30 WPM Hindi and a 10-minute test, but I could not confirm those exact rules from an accessible current-cycle official skill-test instruction. The profile remains a clearly labelled verification-needed practice profile; do not present its result as official qualification.
- **Court typing generally:** There is no single universal court-typing pattern. Duration, speed, error allowance, language and marks depend on the specific High Court/district court and post. Use the court-specific profile or admin template only after entering the relevant notification rules.
- **SSC CGL DEST:** Don't confuse a derived practice rate of 2,000 key depressions in 15 minutes with an official universal WPM qualifying threshold.

## Official source links

- SSC CHSL 2025 notification: https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2025.pdf
- SSC CGL 2025 notification: https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2025.pdf
- RRB NTPC CEN 05/2024 CBTST special instructions (22 Dec 2025): https://www.rrbcdg.gov.in/uploads/2024/05-NTPCG/052024-CBTST_Instructions.pdf
- RRB CBTST corrigendum (24 Dec 2025, 1-minute break): https://rrbsecunderabad.gov.in/wp-content/uploads/2025/12/Corrigendum-No.5_CEN_5_2024-English.pdf
- RRB rescheduling notice (30 Dec 2025, incomplete transcripts still evaluated): https://www.rrbchennai.gov.in/downloads/05-2024-Notice-for-rescheduling-CBTST.pdf
- Delhi Police HCM 2025 notification: https://www.delhipolice.gov.in/RecruitmentFile/76301_Notice_of_DPHCM_2025.pdf
- Delhi High Court JJA/Restorer 2026 vacancy notice: https://www.delhihighcourt.nic.in/files/2026-01/recuritment/vacancy_notice_jja_0.pdf
- BSF recruitment portal (verify the current-cycle notification): https://rectt.bsf.gov.in/
