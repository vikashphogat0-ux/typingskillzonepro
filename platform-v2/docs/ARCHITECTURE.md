# Architecture — TypingSkillZone Platform V2

## Repository strategy

The V2 application is isolated under `platform-v2/` on branch `rebuild/zero-to-advanced`. The existing root application remains the current production implementation. Do not remove or redirect root routes until V2 has passed functional, security, data and deployment acceptance tests.

## Domain boundaries

- `exams`: exam registry and versioned examination policies.
- `passages`: canonical source passage content and exam-specific publication records.
- `typing`: session lifecycle, keyboard policy enforcement and scoring.
- `identity`: users, roles, sessions and institute tenancy.
- `billing`: provider-neutral plans, orders, payment events and entitlements.
- `analytics`: validated attempts and derived performance summaries.

## Passage model

Store source passage content once. Publish it through a separate record for each selected examination and language. Allocate a publication ID from a per-exam sequence in a transaction; enforce a unique constraint on `(exam_id, sequence_number)` and `(exam_id, public_id)`. Never derive IDs from row counts.

## Exam policies

A policy is versioned and includes duration, language, passage presentation, font and page settings, keyboard restrictions, error unit, penalty, WPM formula and qualification threshold. Only policies backed by a current official source may be marked verified. The initial registry deliberately marks all official rules as requiring verification.

## Security boundaries

- Never accept a client-calculated result as authoritative.
- Bind each attempt to an authenticated user, exam, publication and server-created start time.
- Enforce institute tenant scope in every server-side query.
- Verify payment webhooks against raw request bytes and provider signatures.
- Keep provider secrets server-only.
- Keep V2 on a separate database and separate auth configuration until approved.

## Deployment

No deployment target is configured for V2 yet. Cloudflare compatibility must be validated independently before adding V2-specific deployment configuration. Never point V2 at the current production database.
