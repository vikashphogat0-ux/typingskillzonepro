import { sql } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Daily secured job: send 7/3/1-day renewal reminders and one expiry notice per subscription. */
export async function POST(req: Request) {
  const secret = process.env.INSTITUTE_CRON_SECRET?.trim();
  const supplied = req.headers.get("x-institute-cron-secret") ?? "";
  if (!secret || !supplied || supplied !== secret) return Response.json({ error: "Scheduled-job authorization required." }, { status: 403 });
  const db = sql();
  const candidates = await db`
    SELECT s.id AS subscription_id, s.institute_id, s.ends_at, s.status,
      i.name AS institute_name, u.email AS owner_email,
      CASE WHEN s.ends_at <= now() THEN 'expired'
        ELSE 'expiring_' || ceil(extract(epoch FROM (s.ends_at - now())) / 86400)::int::text END AS notification_key,
      CASE WHEN s.ends_at <= now() THEN 0
        ELSE ceil(extract(epoch FROM (s.ends_at - now())) / 86400)::int END AS days_left
    FROM institute_subscriptions s
    JOIN institutions i ON i.id = s.institute_id
    JOIN users u ON u.id = i.owner_id
    WHERE s.ends_at IS NOT NULL
      AND ((s.status = 'active' AND s.ends_at > now() AND s.ends_at <= now() + interval '7 days'
            AND ceil(extract(epoch FROM (s.ends_at - now())) / 86400)::int IN (7, 3, 1))
        OR (s.status IN ('active','expired') AND s.ends_at <= now()))
    ORDER BY s.ends_at ASC LIMIT 200
  `;
  let sent = 0, skipped = 0, failed = 0;
  for (const row of candidates) {
    const [claim] = await db`INSERT INTO institute_notification_log
      (institute_subscription_id, notification_key, recipient_email)
      VALUES (${row.subscription_id}, ${row.notification_key}, ${row.owner_email})
      ON CONFLICT (institute_subscription_id, notification_key) DO NOTHING
      RETURNING id`;
    if (!claim) { skipped++; continue; }
    const subject = row.notification_key === "expired"
      ? `Institute subscription expired — ${row.institute_name}`
      : `Institute subscription expires in ${row.days_left} day(s) — ${row.institute_name}`;
    const message = row.notification_key === "expired"
      ? `The TypingSkillZone institute subscription for ${row.institute_name} has expired. Student enrollment and institute entitlements are paused. Sign in as the institute owner and open the Billing tab to renew your plan.`
      : `The TypingSkillZone institute subscription for ${row.institute_name} expires in ${row.days_left} day(s), on ${new Date(row.ends_at).toLocaleDateString("en-IN")}. To avoid interruption to student enrollment and institute access, sign in as the institute owner and renew from the Billing tab.`;
    try {
      await sendTransactionalEmail({ to: String(row.owner_email), subject, text: message });
      sent++;
    } catch (error) {
      failed++;
      await db`DELETE FROM institute_notification_log WHERE id = ${claim.id}`;
      console.error("Institute subscription notification failed:", error instanceof Error ? error.message : "unknown error");
    }
  }
  await db`UPDATE institute_subscriptions SET status = 'expired'
    WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at <= now()`;
  return Response.json({ ok: failed === 0, candidates: candidates.length, sent, skipped, failed });
}
