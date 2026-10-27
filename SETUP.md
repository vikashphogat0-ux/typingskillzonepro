# TypingSkillZone — Full Infrastructure Setup Guide

Complete step-by-step setup for Neon PostgreSQL, Better Auth, Resend email, and Cloudflare Pages deployment.

---

## Prerequisites

- Node.js 20+ installed
- `npm` or compatible package manager
- Accounts at: [Neon](https://neon.tech), [Cloudflare](https://cloudflare.com), [Resend](https://resend.com), [Razorpay](https://razorpay.com)

---

## Step 1 — Clone and Install

```bash
git clone <your-repo-url>
cd tsz
npm install
cp .env.example .env.local
```

---

## Step 2 — Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech) → **Create project**
2. Choose region: **AWS ap-south-1 (Mumbai)** for best latency from India
3. Note your project name (e.g. `typingskillzone`)
4. Go to **Connection Details** → copy the connection string

   It looks like:
   ```
   postgres://user:password@ep-xxxx-xxxx.ap-south-1.aws.neon.tech/neondb?sslmode=require
   ```

5. Paste it into `.env.local`:
   ```
   DATABASE_URL=postgres://user:password@ep-xxxx.ap-south-1.aws.neon.tech/neondb?sslmode=require
   ```

6. **Run the main schema** (creates all tables):
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```
   On Windows (PowerShell):
   ```powershell
   $env:PGPASSWORD="your-password"
   psql -h ep-xxxx.ap-south-1.aws.neon.tech -U user -d neondb -f db/schema.sql
   ```

7. **Run the Better Auth migration** (creates auth tables):
   ```bash
   npx @better-auth/cli migrate
   ```
   When prompted, confirm the Neon connection string from `DATABASE_URL`.

8. **Seed the exam simulators** (26 official Indian exam templates):
   ```bash
   psql "$DATABASE_URL" -f db/seed-simulators.sql
   ```

9. **Verify the setup**:
   ```bash
   psql "$DATABASE_URL" -c "SELECT slug, name, display_mode FROM exam_templates ORDER BY name;"
   ```
   You should see 26+ rows (SSC CHSL, RRB NTPC, Delhi Police, Courts, etc.).

---

## Step 3 — Better Auth

Better Auth handles sign-in, sign-up, email verification, and password reset.

1. Generate a secret (32+ random characters):
   ```bash
   openssl rand -base64 32
   ```
   On Windows PowerShell:
   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
   ```

2. Add to `.env.local`:
   ```
   BETTER_AUTH_SECRET=<your-generated-secret>
   BETTER_AUTH_URL=http://localhost:3000
   ```
   For production, change `BETTER_AUTH_URL` to your actual domain:
   ```
   BETTER_AUTH_URL=https://typingskillzone.in
   ```

3. The auth API route is already wired at `app/api/auth/[...all]/route.ts`.
   Better Auth tables (`user`, `session`, `account`, `verification`) were created in Step 2.

---

## Step 4 — Resend (Verification Emails)

Resend sends verification emails on sign-up and password-reset links.

1. Go to [resend.com](https://resend.com) → Create account
2. **Add and verify your domain**:
   - Dashboard → Domains → Add Domain
   - Add the DNS records shown (MX, SPF, DKIM) to your domain registrar
   - Wait for verification (usually 5–30 minutes)
3. **Create an API key**:
   - Dashboard → API Keys → Create API Key
   - Permission: **Sending access**
4. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM="TypingSkillZone <no-reply@typingskillzone.in>"
   ```
   Replace `typingskillzone.in` with your actual verified domain.

5. **Test locally**: sign up for an account at `http://localhost:3000/login` and check your inbox.

> **Without Resend**: The app still works — sign-up succeeds but no verification email is sent. Users can still sign in; email verification is skipped.

---

## Step 5 — Razorpay (Payments)

Razorpay handles Pro subscription payments (one-time, no auto-renew).

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) → API Keys
2. **Start with test keys** — they are safe for development
3. Add to `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
   ```

4. **Set up the webhook** (after deploying):
   - Razorpay Dashboard → Webhooks → Add Webhook
   - URL: `https://YOUR-DOMAIN/api/subscription/webhook`
   - Events: `payment.captured`, `order.paid`
   - Secret: same as `RAZORPAY_WEBHOOK_SECRET`

5. **Switch to live keys** only when:
   - Your domain is live and HTTPS
   - The webhook is verified and receiving events
   - You've tested the full payment + Pro activation flow

> **Payment security**: All payments are verified server-side via webhook signature. The Pro plan is only activated after `payment.captured` from Razorpay, never from the browser.

---

## Step 6 — Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful local checks:
- Sign up: `/login` → Create account
- Admin panel (make yourself admin first — see below): `/admin`
- All simulators: `/simulators`
- Run TypeScript check: `npm run typecheck`

**Making yourself admin** (run once after sign-up):
```bash
psql "$DATABASE_URL" -c "UPDATE users SET role='admin' WHERE email='your@email.com';"
```

---

## Step 7 — Cloudflare Pages Deployment

### 7a. Install the Cloudflare adapter

```bash
npm install -D @cloudflare/next-on-pages
```

Add to `package.json` scripts:
```json
"cf:build": "npx @cloudflare/next-on-pages",
"cf:preview": "npx wrangler pages dev .vercel/output/static"
```

### 7b. Update `next.config.mjs`

The file is already updated to support the Edge runtime. Verify it contains:
```js
export const runtime = "edge";
```
on all API route files that need it, **or** use the hybrid approach in `next.config.mjs`.

### 7c. Create a Cloudflare Pages project

```bash
# Login to Cloudflare
npx wrangler login

# Create Pages project (first time only)
npx wrangler pages project create typingskillzone-pro --production-branch main
```

### 7d. Add environment variables to Cloudflare

```bash
# Add each secret (prompts for value)
npx wrangler pages secret put DATABASE_URL --project-name typingskillzone-pro
npx wrangler pages secret put BETTER_AUTH_SECRET --project-name typingskillzone-pro
npx wrangler pages secret put BETTER_AUTH_URL --project-name typingskillzone-pro
npx wrangler pages secret put RESEND_API_KEY --project-name typingskillzone-pro
npx wrangler pages secret put EMAIL_FROM --project-name typingskillzone-pro
npx wrangler pages secret put RAZORPAY_KEY_ID --project-name typingskillzone-pro
npx wrangler pages secret put RAZORPAY_KEY_SECRET --project-name typingskillzone-pro
npx wrangler pages secret put RAZORPAY_WEBHOOK_SECRET --project-name typingskillzone-pro
```

Or set them in the Cloudflare Dashboard:
- Pages → typingskillzone-pro → Settings → Environment variables

### 7e. Build and deploy

```bash
# Build for Cloudflare
npm run cf:build

# Deploy
npx wrangler pages deploy .vercel/output/static --project-name typingskillzone-pro
```

### 7f. Connect a custom domain

- Cloudflare Dashboard → Pages → typingskillzone-pro → Custom domains
- Add your domain (e.g. `typingskillzone.in`)
- Cloudflare handles SSL automatically

### 7g. CI/CD with GitHub Actions (optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run cf:build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: typingskillzone-pro
          directory: .vercel/output/static
```

---

## Step 8 — Post-deployment Checklist

- [ ] Open `https://your-domain.in` — homepage loads
- [ ] Sign up with your email → verification email arrives
- [ ] Click verification link → account confirmed
- [ ] Log in at `/login`
- [ ] Open `/simulators` → 26+ exam simulators visible
- [ ] Start an SSC CHSL test → typing simulator works
- [ ] Go to `/pricing` → Razorpay checkout loads (test mode)
- [ ] Make yourself admin, open `/admin` → stats dashboard loads
- [ ] Test forgot-password flow → reset email arrives
- [ ] Set `BETTER_AUTH_URL` to production domain (not localhost)
- [ ] Switch to Razorpay live keys when ready for real payments

---

## Exam Simulators Reference

| Exam | Language | Duration | Display Mode | Backspace | Qualifying |
|------|----------|----------|--------------|-----------|------------|
| SSC CHSL | English | 10 min | Highlighted | Full | 35 WPM |
| SSC CHSL | Hindi | 10 min | Highlighted | Full | 30 WPM |
| SSC CGL DEO | English | 15 min | Unhighlighted | Full | 26.67 WPM (8000 KPH) |
| SSC CGL LDC | English | 10 min | Highlighted | Full | 35 WPM |
| RRB NTPC | English | 10 min | Highlighted | Full | 30 WPM |
| RRB NTPC | Hindi | 10 min | Highlighted | Full | 25 WPM |
| Delhi Police HCM | English | 10 min | **Offscreen** | Word | 35 WPM |
| Delhi Police HCM | Hindi | 10 min | **Offscreen** | Word | 30 WPM |
| BSF HCM | English | 10 min | **Offscreen** | Word | 35 WPM |
| CRPF HCM | English | 10 min | **Offscreen** | Word | 35 WPM |
| CISF HCM | English | 10 min | **Offscreen** | Word | 35 WPM |
| DSSSB LDC | English | 10 min | Highlighted | Full | 35 WPM |
| DSSSB LDC | Hindi | 10 min | Highlighted | Full | 30 WPM |
| High Court Clerk | English | 10 min | **Offscreen** | Word | 30 WPM |
| High Court Clerk | Hindi | 10 min | **Offscreen** | Word | 25 WPM |
| District Court Clerk | English | 10 min | **Offscreen** | Word | 35 WPM |
| District Court Clerk | Hindi | 10 min | **Offscreen** | Word | 30 WPM |
| UPSSC LDC | Hindi | 10 min | **Offscreen** | Word | 25 WPM |
| UPSSSC | Hindi | 10 min | Highlighted | Full | 25 WPM |
| RSMSSB LDC | Hindi | 10 min | Highlighted | Full | 35 WPM |
| RSMSSB LDC | English | 10 min | Highlighted | Full | 35 WPM |
| IBPS DEST | English | 5 min | Unhighlighted | Full | 8000 KPH |
| Practice 1-min | Hindi | 1 min | Highlighted | Full | — |
| Practice 5-min | Hindi | 5 min | Highlighted | Full | — |

---

## Troubleshooting

### "DATABASE_URL is not set"
Add `DATABASE_URL` to `.env.local`. For Cloudflare, use `wrangler pages secret put DATABASE_URL`.

### "Auth tables don't exist"
Run `npx @better-auth/cli migrate` with `DATABASE_URL` in your environment.

### "No simulators showing on /simulators"
Run `psql "$DATABASE_URL" -f db/seed-simulators.sql` to seed the exam templates.

### TypeScript errors
Run `npm run typecheck` — should report zero errors. If new errors appear after a dependency upgrade, check the better-auth changelog for API changes.

### Cloudflare build fails
Ensure all API routes that use Node.js built-ins have `export const runtime = "edge"` or are compatible with the Edge runtime. The `@neondatabase/serverless` package already supports the Edge runtime natively.

### Emails not sending
Check `RESEND_API_KEY` is set and your domain is verified in the Resend dashboard. The app works without Resend — email verification is simply skipped.

### Payments not activating Pro
Verify the Razorpay webhook is configured and receiving events. Check `/api/subscription/webhook` is reachable from Razorpay's servers. Pro is only activated after a verified `payment.captured` webhook.
