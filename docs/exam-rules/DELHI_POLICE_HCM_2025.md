# Delhi Police Head Constable (Ministerial) — official typing pattern

**Source cycle:** Head Constable (Ministerial) in Delhi Police Examination, 2025  
**Issuing authority:** Staff Selection Commission, Government of India  
**Primary source:** [SSC official notification (PDF)](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_DPHCM_2025.pdf?mode=light)  
**Relevant sections:** paragraphs 24, 24.1, 24.2 and 25 (PDF pages 22–23).

This specification records only requirements stated in the cited notification. It is not a claim that TypingSkillZone is an official SSC or Delhi Police examination system.

## Typing test — official requirements

| Rule | English | Hindi |
|---|---:|---:|
| Duration | 10 minutes | 10 minutes |
| Minimum qualifying speed | 30 WPM | 25 WPM |
| Minimum printed passage | 400 words or 2,000 strokes | 350 words or 1,750 strokes |
| Maximum typing time | Stop at 10 minutes | Stop at 10 minutes |
| Maximum typing-test marks | 25 | 25 |

The notice defines tentative speed using total strokes divided by five, then divided by the 10-minute test duration. It states that one word is deducted for each mistake. Its worked example is 2,000 strokes / 5 = 400 words; 400 / 10 = 40 WPM tentative speed; 10 mistakes; actual speed = 30 WPM.

## Mistake categories explicitly listed

- Omission
- Substitution
- Addition of punctuation marks
- Wrong case (capital instead of small or vice versa)
- A gap inside a word
- More gap between two words
- Failure to make paragraph(s)

The notification says “1 word for each mistake.” It does not publish a complete machine-readable algorithm for every possible combination of mistakes. Where the simulator cannot faithfully detect a listed mistake (for example, paragraph structure or spacing distinctions lost by normalization), it must not silently claim complete official evaluation.

## Typing-test marks table

| Actual speed | English marks | Hindi marks |
|---|---:|---:|
| Below 30 / 25 WPM | Disqualified | Disqualified |
| 30 / 25 WPM | 10 | 10 |
| 31–35 / 26–30 WPM | 12 | 12 |
| 36–40 / 31–35 WPM | 15 | 15 |
| 41–45 / 36–40 WPM | 18 | 18 |
| 46–50 / 41–45 WPM | 21 | 21 |
| Above 50 / above 45 WPM | 25 | 25 |

## Next stage — Computer (Formatting) Test

The notification states that candidates who qualify the typing test are called for a qualifying Computer (Formatting) Test in:
- MS Word — 10 minutes
- MS PowerPoint — 10 minutes
- MS Excel — 10 minutes

It lists formatting tasks for each application and requires at least 6 out of 10 marks in each test. The notification also states that editing tools may be used to correct mistakes in the formatting test.

## Rules not specified by the typing-test paragraphs

- The typing-test paragraphs do not specify whether Backspace, Delete, arrow keys, mouse cursor movement, copy/paste, spell-check or autocorrect are enabled or disabled. Do not label any such behavior as officially confirmed without a separate authoritative instruction.
- The notice requires a printed passage; an on-screen passage is a practice convenience, not the notified delivery format.
- The notice specifies minimum passage lengths, not a maximum passage length.

## Implementation safeguards

1. Keep English and Hindi thresholds separate.
2. Use the notification's 10-minute duration and minimum passage lengths.
3. Apply one full mistake per detected mistake; do not award half mistakes.
4. Calculate actual speed as tentative WPM minus mistakes, matching the official worked example.
5. Apply the published marks bands to actual speed.
6. Clearly distinguish verified official rules from unspecified keyboard behavior and practice-only features.
7. Keep the Word, PowerPoint and Excel formatting test separate from the typing simulator; it is a separate qualifying stage.
