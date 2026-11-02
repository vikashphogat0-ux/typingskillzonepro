import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { requireStaff, addInstituteStudent } from "@/lib/inst-server";
import { sendTransactionalEmail } from "@/lib/mailer";
import { normalizeInvitationEmails } from "@/lib/institute-workflows";

export const dynamic = "force-dynamic";

function origin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_URL?.trim();
  return configured ? new URL(configured).origin : new URL(req.url).origin;
}

/** Invite registered or not-yet-registered students by email; accepts CSV-imported email lists. */
export async function POST(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const body = await req.json().catch(() => null);
  const normalized = normalizeInvitationEmails(Array.isArray(body?.emails) ? body.emails : [body?.email]);
  if (normalized.error) return Response.json({ error: normalized.error }, { status: 422 });
  const emails = normalized.emails;

  const results: { email: string; status: string; error?: string }[] = [];
  const db = sql();
  const [institute] = await db`SELECT i.name, u.email AS owner_email FROM institutions i JOIN users u ON u.id = i.owner_id WHERE i.id = ${c.m.institution_id} AND i.status = 'approved'`;
  if (!institute) return Response.json({ error: "Approved institute not found." }, { status: 404 });

  for (const email of emails) {
    const [user] = await db`SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1`;
    if (user) {
      const added = await addInstituteStudent(c.m.institution_id, user.id);
      if (added.added) {
        await db`UPDATE institute_invitations SET accepted_at = now() WHERE institution_id = ${c.m.institution_id} AND lower(email) = ${email} AND accepted_at IS NULL`;
        results.push({ email, status: "enrolled" });
      } else {
        results.push({ email, status: "not_enrolled", error: !added.hasActivePlan ? "Active institute subscription required." : added.seatsUsed >= added.seatLimit ? "Student seat limit reached." : "Account already belongs to an institute." });
      }
      continue;
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [created] = await db`
      WITH locked AS MATERIALIZED (
        SELECT id FROM institutions WHERE id = ${c.m.institution_id} AND status = 'approved' FOR UPDATE
      ),
      entitlement AS MATERIALIZED (
        SELECT p.max_student_seats + COALESCE((SELECT SUM(a.quantity * 50)::int FROM add_on_purchases a
          WHERE a.institute_id = s.institute_id AND a.add_on_id = 'additional_50_seats'
          AND a.status = 'verified' AND (a.valid_until IS NULL OR a.valid_until > now())), 0) AS seat_limit
        FROM institute_subscriptions s JOIN institute_plans p ON p.id = s.plan_id AND p.is_active = true
        JOIN locked l ON l.id = s.institute_id
        WHERE s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > now())
        ORDER BY s.ends_at DESC NULLS LAST, s.started_at DESC LIMIT 1
      ),
      usage AS MATERIALIZED (
        SELECT
          (SELECT count(*)::int FROM institution_members im JOIN locked l ON l.id = im.institution_id WHERE im.role = 'student') +
          (SELECT count(*)::int FROM institute_invitations iv JOIN locked l ON l.id = iv.institution_id
            WHERE iv.accepted_at IS NULL AND iv.expires_at > now()) AS used
      ),
      inserted AS (
        INSERT INTO institute_invitations (institution_id, email, token_hash, invited_by, expires_at)
        SELECT l.id, ${email}, ${tokenHash}, ${c.uid}, now() + interval '7 days'
        FROM locked l CROSS JOIN entitlement e CROSS JOIN usage u
        WHERE u.used < e.seat_limit
          AND NOT EXISTS (SELECT 1 FROM institute_invitations iv WHERE iv.institution_id = l.id AND lower(iv.email) = ${email} AND iv.accepted_at IS NULL AND iv.expires_at > now())
        RETURNING id
      )
      SELECT (SELECT count(*)::int FROM inserted) AS inserted,
        (SELECT seat_limit FROM entitlement) AS seat_limit,
        (SELECT used FROM usage) AS used
    `;
    if (Number(created?.inserted ?? 0) !== 1) {
      results.push({ email, status: "not_invited", error: created?.seat_limit == null ? "Active institute subscription required." : Number(created.used) >= Number(created.seat_limit) ? "Student seat limit reached." : "An active invitation already exists." });
      continue;
    }
    const inviteUrl = `${origin(req)}/join?invite=${token}`;
    try {
      await sendTransactionalEmail({
        to: email,
        subject: `Invitation to join ${institute.name} on TypingSkillZone`,
        text: `You have been invited to join ${institute.name} on TypingSkillZone. Sign in or create an account using this email address, then accept the invitation here: ${inviteUrl}\n\nThis invitation expires in 7 days. If you were not expecting it, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>You are invited to join ${String(institute.name).replace(/[&<>"]/g, "")}</h2><p>Sign in or create a TypingSkillZone account using this email address, then accept your institute invitation.</p><p><a href="${inviteUrl}">Accept institute invitation</a></p><p>This invitation expires in 7 days.</p></div>`,
      });
      results.push({ email, status: "invited" });
    } catch (error) {
      await db`DELETE FROM institute_invitations WHERE id = (SELECT id FROM institute_invitations WHERE token_hash = ${tokenHash} LIMIT 1)`;
      results.push({ email, status: "email_failed", error: error instanceof Error ? error.message : "Could not send invitation email." });
    }
  }
  const counts = results.reduce<Record<string, number>>((acc, row) => { acc[row.status] = (acc[row.status] ?? 0) + 1; return acc; }, {});
  return Response.json({ ok: results.every((r) => ["enrolled", "invited"].includes(r.status)), counts, results });
}
