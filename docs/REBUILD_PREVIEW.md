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

## Preview deployment from VS Code (does not replace production)

The preview Worker name is `typingskillzone-rebuild-preview`. It uses a separate Worker name and workers.dev URL; it does not reuse the production Worker name or custom domain.

### 1. Create an isolated Neon preview database

Create a Neon database branch for staging from the Neon console. Use its connection string as the preview `DATABASE_URL`. Do not point the preview Worker at the live production database: practice attempts, admin uploads and subscription events write data.

The preview database must contain the current application schema and seed data. Use a Neon branch/backup and apply only reviewed, additive migrations. Do not run the destructive fresh-auth cutover.

### 2. Configure Cloudflare credentials in the VS Code terminal

Use a Cloudflare API token with Workers Scripts edit permission. Authenticate Wrangler:

```powershell
npx wrangler login
$env:CLOUDFLARE_ACCOUNT_ID = "YOUR_CLOUDFLARE_ACCOUNT_ID"
```

If you use an API token instead of Wrangler OAuth, set `CLOUDFLARE_API_TOKEN` in the terminal environment. Never commit it.

### 3. Build and deploy the preview Worker

Set the Neon Auth public URL before the build because Next.js embeds `NEXT_PUBLIC_*` variables at build time:

```powershell
$env:NEXT_PUBLIC_NEON_AUTH_URL = "YOUR_PREVIEW_NEON_AUTH_BASE_URL"
npm run deploy:preview
```

Expected preview host for the current Cloudflare workers.dev account:

`https://typingskillzone-rebuild-preview.vikashphogat0.workers.dev`

### 4. Add preview Worker runtime secrets

After the first deploy creates the Worker, run each command and paste the corresponding value when Wrangler prompts:

```powershell
npx wrangler secret put DATABASE_URL --config wrangler.preview.jsonc
npx wrangler secret put NEON_AUTH_BASE_URL --config wrangler.preview.jsonc
npx wrangler secret put CF_MERCHANT_ID --config wrangler.preview.jsonc
npx wrangler secret put CF_SECRET_KEY --config wrangler.preview.jsonc
npx wrangler secret put SUPER_ADMIN_EMAILS --config wrangler.preview.jsonc
npx wrangler secret put GROQ_API_KEY --config wrangler.preview.jsonc
npx wrangler secret put PASSAGE_CRON_SECRET --config wrangler.preview.jsonc
```

Use the Neon **preview branch** connection string, the preview Neon Auth URL, and Cashfree **sandbox** credentials. The last two secrets are optional if AI passage generation and scheduled publishing are not enabled. Redeploy with `npm run deploy:preview` after changing build-time public environment values.

### 5. Configure the Cashfree sandbox webhook

In Cashfree sandbox settings, set the webhook URL to the preview URL plus `/api/webhook` and subscribe to `PAYMENT_SUCCESS_WEBHOOK`. Do not change the live Cashfree webhook while testing the preview.

## Important boundaries

- This branch does not change `main`.
- The existing production Worker and `typingskillzone.in` custom domain are not modified.
- The existing production database is not migrated or reset.
- Payment processing is sandbox-only in the preview.
- A successful GitHub push is not proof of a successful build or deployment. Check the Actions run and open the deployed preview URL.
- Promote this branch to production only after end-to-end tests for signup/login, admin passage upload, every exam simulator, result persistence, institute access and Cashfree sandbox checkout.
