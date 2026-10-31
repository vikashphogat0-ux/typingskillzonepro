# TypingSkillZone Platform V2

This is the isolated, greenfield application being developed inside the existing `typingskillzonepro` GitHub repository. It lives under `platform-v2/` so the current production application, deployment configuration, secrets and integrations remain untouched during development.

## Local development

```bash
cd platform-v2
npm install
npm run dev
```

Open http://localhost:3000.

## Current status

- Phase 1 foundation: Next.js App Router, TypeScript configuration, independent styling and app entry point.
- Initial examination registry: Delhi Police HCM, BSF HCM, SSC CGL, SSC CHSL, Railway/RRB and Court Typing.
- Dedicated exam workspace route with an explicit empty state; it does not read legacy passage or student data.
- Pure typing score calculation helper with caller-supplied policy.
- Official examination timing, penalties and keyboard policies are intentionally gated until verified against current official notices.

## Isolation and safety

- No production database URL, credentials or environment files are copied.
- No production authentication or payment provider is connected.
- No database migration is run.
- No Cloudflare production configuration is changed.
- This application is not deployed by this branch.

## Next milestones

1. Verify official exam rules and define versioned policy fixtures.
2. Design a new database schema and migrations for a separate database.
3. Implement authentication and server-side role/tenant authorization.
4. Build passage source management, exam publication records and atomic exam-specific IDs.
5. Implement the actual typing session lifecycle, server validation and result persistence.
6. Add student, admin and institute workflows, followed by payment sandbox adapters.
