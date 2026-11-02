# Full Website Functional Audit

Branch: `rebuild/full-website`

## Audit rules

A control is considered functional only when all of the following are verified:
1. Its label and intended action are unambiguous.
2. It reaches the correct page or API route.
3. The API validates input and authorization server-side.
4. Success changes the expected persisted state or navigates to the correct destination.
5. Failure, empty, loading and unauthorized states are visible and recoverable.
6. The action is covered by an automated test where practical.
7. Production-only integrations are verified in a safe sandbox before production.

A TypeScript build or unit test pass is not evidence of end-to-end browser, database, email, payment or Cloudflare functionality.

## Non-negotiable safety constraints

- Never reset, drop, truncate or replace the production database.
- Do not change hosting, database, authentication, email or payment providers.
- Preserve Cashfree and Razorpay integration, existing auth, institute features, test history, scoring and simulator rules.
- No production migration or deployment without explicit confirmation.
- Do not report a control as verified merely because a handler exists.

## Functional areas and acceptance tests

| Area | Pages / controls | Required end-to-end result | Status |
|---|---|---|---|
| Public navigation | SiteShell header/footer links | Every link resolves; active state and mobile navigation work | Static route map started; browser verification pending |
| Homepage | Exam groups and cards | Loads active exams; each card opens its exact exam simulator | Source traced; DB/browser verification pending |
| Exam directory | Search, language, popular filters, exam cards | Filters update results; details and simulator links match same slug | Source traced; browser verification pending |
| Exam details | Open simulator, browse exams | Correct slug and language carried to simulator | Source traced; browser verification pending |
| Simulator dashboard | Tabs, passage selection, modes, start, daily/monthly lists, performance, leaderboard | Each tab renders its intended data; test start creates a test with the correct template rules; result saves | Source traced; end-to-end verification pending |
| Free practice | Language, passage source, mode, start, retry, results | Passage loads; timer/scoring work; result saves for signed-in user; limit/upgrade errors are actionable | Source traced; end-to-end verification pending |
| Passage library | Daily/archive/all, search, view, download, print | Correct passage content and language; downloads contain selected passage/set | Source traced; end-to-end verification pending |
| Passage Studio | Configure, format groups, exam selection, upload, review, publish, edit, archive | Real active exam templates populate groups; selected exams receive correct copies; master version and distribution records stay consistent | Blocked until DB catalogue/schema verified; browser verification pending |
| Admin passage manager | Generate, single upload, bulk upload, select/delete, edit, archive | All operations return accurate row-level success/failure; bulk failures do not silently lose passages | Source traced; end-to-end verification pending |
| Admin exam templates | Create, edit, activate/deactivate, formatting save | Settings persist and reload; built-in rules cannot be accidentally overwritten | Source traced; end-to-end verification pending |
| Admin users | Search, role changes | Search is accurate; role updates enforce authorization and persist | Source traced; end-to-end verification pending |
| Admin institutes | Approve, suspend, grant, revoke | State transitions persist and affect entitlements correctly | Source traced; end-to-end verification pending |
| Admin subscribers/payments | Grant/revoke, search/filter | Admin actions are authorized and reconcile with payment records | Source traced; sandbox verification pending |
| Institute portal | Students, CSV invites, batches, assignments, reports, billing, teachers | Correct membership/permissions; CSV row errors reported; assignment links start correct exam; report downloads; checkout sandbox reconciles | Source traced; sandbox verification pending |
| Authentication/profile | Sign in/up, verify, reset, profile, password, sign out | Session lifecycle, email verification and password changes work end-to-end | Source traced; provider verification pending |
| Pricing/checkout | Plan selection, checkout, refresh | Correct plan and amount; provider checkout and signed webhook activate entitlement once | Source traced; sandbox verification pending |
| Results | History, detail, result actions | Correct owner authorization, accurate saved scoring and stable history | Source traced; end-to-end verification pending |
| Coach/learning | Insights, drills, lesson progression, notifications | Data derived from saved attempts; drill completion updates progression; unsupported notifications degrade gracefully | Source traced; end-to-end verification pending |
| Contact/feedback | Submit forms | Validation, spam/error handling and delivery confirmation | Source traced; delivery verification pending |

## Current technical coverage

The repository currently has unit tests for:
- Cashfree signature/payment behavior
- Institute workflow helpers
- Passage generation planning
- Simulator passage formatting
- WPM/scoring calculations

There is no comprehensive browser-level end-to-end suite in the current package scripts. This is a material gap: buttons and navigation cannot be certified from unit tests alone.

## Known database dependency: Passage Studio

The current Passage Studio format groups are derived from active rows in `exam_templates`, grouped by:
- language
- passage layout
- display mode

The selected group then supplies template slugs to the existing passage publication API.

The database must therefore have:
- the intended active exam catalogue seeded;
- the simulator passage-formatting columns;
- the additive passage master/version/distribution tables.

Relevant reviewed migrations:
- `db/migrations/20261101_complete_exam_catalogue.sql`
- `db/migrations/20261101_simulator_passage_formatting_controls.sql`
- `db/migrations/20261101_passage_intelligence_system.sql`

Do not apply these blindly. First run the read-only diagnostic and inspect which migrations are already represented in the target database. The read-only check is `npm run db:check-passage-formatting`.

## Execution order

1. Establish clean source baseline and passing typecheck/unit tests.
2. Verify database schema and exam catalogue without changing data.
3. Fix the catalogue/template source and simulator formatting configuration.
4. Complete Passage Studio import -> review -> publish -> simulator retrieval tests.
5. Verify test start -> typing -> scoring -> save -> result history.
6. Verify admin CRUD and role/permission boundaries.
7. Verify institute enrollment, assignments, reporting and billing in sandbox.
8. Verify auth/email and Cashfree/Razorpay flows in sandbox.
9. Add browser-level smoke tests for all public routes and critical admin/student workflows.
10. Only then approve production migration/deployment.

## Evidence log

- Static source review began on 2026-11-02.
- Latest branch commit at initial audit: `ea089c2625c0060aea1b94baaf52c0569a180faf`.
- GitHub Actions for that commit: typecheck, unit tests and build passed.
- This is not a production integration or browser acceptance result.
