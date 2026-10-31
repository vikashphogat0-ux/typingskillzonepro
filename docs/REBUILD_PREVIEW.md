# TypingSkillZone — rebuild branch and preview deployment

## Pull the rebuild into VS Code

Run these commands in PowerShell from the directory where you want the repository:

```powershell
git clone https://github.com/vikashphogat0-ux/typingskillzonepro.git
cd typingskillzonepro
git fetch origin
git switch rebuild/full-website
git pull origin rebuild/full-website
npm ci
npm run dev
```

If the repository is already on your computer:

```powershell
git fetch origin
git switch rebuild/full-website
git pull origin rebuild/full-website
npm ci
npm run dev
```

Open http://localhost:3000.

## What is in this branch

- New charcoal-glass homepage and responsive design system.
- Exam directory with independent simulator routes.
- Per-exam dashboard tabs: dashboard, practice, daily passages, monthly library, performance and leaderboard.
- Exam-specific passage filtering for the daily, recent and monthly sections.
- Admin passage authoring and TXT bulk upload.
- Multi-directory publication: select multiple active exam templates of the matching language; each selected exam receives its own passage row and its own directory listing.
- Existing typing session, server-side scoring, result history, auth, institute and Cashfree services remain in the root application.
- Separate Cloudflare preview Worker configuration and manual GitHub Actions deployment workflow.

## Preview deployment (does not replace production)

The preview Worker name is `typingskillzone-rebuild-preview`. It does not reuse the production Worker name, route or custom domain.

### 1. Create an isolated Neon preview database

Create a Neon database branch for staging from the Neon console. Use its connection string as `PREVIEW_DATABASE_URL`. Do not point the preview Worker at the live production database: practice attempts, admin uploads and subscriptions can write data.

The preview database must contain the current application schema and seed data. Use a backup/branch and apply only reviewed, additive migrations. Do not run the destructive fresh-auth cutover.

### 2. Add GitHub Actions secrets

In GitHub, open Settings → Secrets and variables → Actions → New repository secret. Add:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers Scripts edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `PREVIEW_DATABASE_URL` | Neon staging branch connection string |
| `PREVIEW_NEON_AUTH_BASE_URL` | Neon Auth base URL configured for the preview environment |
| `CASHFREE_SANDBOX_MERCHANT_ID` | Cashfree sandbox App ID |
| `CASHFREE_SANDBOX_SECRET_KEY` | Cashfree sandbox secret |
| `PREVIEW_SUPER_ADMIN_EMAILS` | Comma-separated admin email allowlist for the preview |
| `GROQ_API_KEY` | Optional AI passage generation key |
| `PASSAGE_CRON_SECRET` | Optional strong secret for scheduled passage generation |

Do not paste credentials into source files, commit them, or use live Cashfree credentials for the preview.

### 3. Run the preview workflow

Open Actions → Deploy rebuild preview → Run workflow. The workflow runs typecheck, tests and the Cloudflare build before deployment. It deploys only the preview Worker and configures its runtime secrets.

Expected preview host after a successful deployment:

`https://typingskillzone-rebuild-preview.vikashphogat0.workers.dev`

Cloudflare may require enabling the workers.dev subdomain once in the dashboard.

After deployment, configure the Cashfree **sandbox** webhook to the preview URL plus `/api/webhook` and subscribe to `PAYMENT_SUCCESS_WEBHOOK`. Do not change the live Cashfree webhook while testing the preview.

## Important boundaries

- This branch does not change `main`.
- The existing production Worker and `typingskillzone.in` custom domain are not modified.
- The existing production database is not migrated or reset.
- Payment processing is sandbox-only in the preview.
- A successful GitHub push is not proof of a successful build or deployment. Check the Actions run and open the deployed preview URL.
- Promote this branch to production only after end-to-end tests for signup/login, admin passage upload, every exam simulator, result persistence, institute access and Cashfree sandbox checkout.
