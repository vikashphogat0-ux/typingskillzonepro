# TypingSkillZone Pro: build steps 1 to 4

1. `db/schema.sql`, `lib/db.ts`, config files: users, subscriptions, exam_templates, passages, tests, results.
2. `lib/wpmCalculator.ts`, `lib/backspacePolicy.ts`: scoring and backspace rules. `npm test` runs `tests/`.
3. `components/TypingSimulator.tsx`, `app/test/page.tsx`: three display modes, three backspace modes, timer with auto-submit.
4. `app/dashboard/page.tsx`, `lib/analytics.ts`, `components/charts.tsx`, `app/api/*`: analytics, heatmap, coaching.

Setup: `npm install`, copy `.env.example` to `.env.local`, run `db/schema.sql` on Neon, `npm run dev`.
Sign-in: better-auth (email and password, Resend verification) in `lib/authServer.ts`, `/login`, `lib/auth.ts` (`getUserId`, `requireAdmin`). Run `npx @better-auth/cli migrate`, set BETTER_AUTH_SECRET and BETTER_AUTH_URL. If you already have a better-auth instance, delete `lib/authServer.ts` and `app/api/auth`, and import your own `auth` in `lib/auth.ts`. Sign in once, then run `db/make-admin.sql` and verify your email.
Scoring presets in `lib/wpmCalculator.ts` and `lib/presets.ts` are starting points; verify them against each official notification.
Also built: touch-typing course (`app/learn`, `lib/lessons.ts`, `components/FingerGuide.tsx`, `components/LessonDrill.tsx`).
Admin panel at `/admin` (passages, bulk upload, exam templates). Promote yourself with `db/make-admin.sql`. Admin routes are protected by `requireAdmin` in `lib/auth.ts`, which needs your real `getUserId`.
Subscriptions: Free and Pro plans (`lib/plans.ts`), Razorpay one-time checkout, verify and webhook routes under `app/api/subscription`, `/pricing`, and `/admin/subscribers` for manual grants. Re-run `db/schema.sql` (safe to repeat) to add the payments table. Set the RAZORPAY_* variables and add the webhook in the Razorpay dashboard. Test with test keys first.

## Institutes, simulators, leaderboards, library
- Simulators = rows in `exam_templates`. Run `db/seed-simulators.sql` to insert/update the exam catalogue (safe to re-run). Run `db/seed-practice-passages.sql` to insert missing English and Hindi starter passages for the public Passage Library (safe to re-run; it never overwrites existing passages). Apply `db/schema.sql` first if the tables have not been created. Rules (display, backspace, time, scoring) are locked per simulator and applied by the server.
- `POST /api/tests/start` makes the server pick and store the reference text. `POST /api/results` with `testId` verifies the key log, recomputes the score and flags impossible speed. Flagged attempts stay off leaderboards.
- Leaderboard per simulator: `lib/leaderboard.ts` (best valid attempt per student, full-length only). Scopes: all students or own institute; all time, 30 days, 7 days.
- Institutes: `/institution/register`, admin approval at `/admin/institutions`, panel at `/institution`, students join at `/join` with a code. Members of an approved institute get unlimited tests.
- Passage library: `/library` (daily English and Hindi passage, 14-day archive, search, .txt download, print). Passages come from the admin panel.
- Result detail with side-by-side comparison and mistake patterns: `/results/[id]`.
