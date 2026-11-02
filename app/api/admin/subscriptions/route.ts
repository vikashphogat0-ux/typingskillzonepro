import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { grantPro, revokePro } from "@/lib/subscription";
import { STUDENT_PLANS, getInstitutePlan, type InstitutePlanId, type StudentPlanId } from "@/lib/pricing";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });
const paidPlanIds = Object.keys(STUDENT_PLANS).filter((id) => id !== "free") as StudentPlanId[];

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "student";
  if (kind === "institute") {
    const rows = await sql()`
      SELECT i.id AS institution_id, i.name AS institution_name, u.email AS owner_email,
        ip.plan_id, s.status, s.started_at, s.ends_at,
        (s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > now())) AS is_active,
        ip.max_student_seats,
        (SELECT count(*)::int FROM institution_members im WHERE im.institution_id = i.id AND im.role = 'student') AS students
      FROM institute_subscriptions s
      JOIN institutions i ON i.id = s.institute_id
      JOIN users u ON u.id = i.owner_id
      JOIN institute_plans ip ON ip.id = s.plan_id
      ORDER BY s.started_at DESC LIMIT 200
    `;
    return Response.json(rows);
  }
  if (kind !== "student") return Response.json({ error: "Unknown subscription type." }, { status: 400 });
  return Response.json(await sql()`
    SELECT u.id AS user_id, u.email, s.plan, s.status, s.starts_at, s.ends_at,
      (s.status = 'active' AND s.ends_at > now()) AS is_pro
    FROM subscriptions s JOIN users u ON u.id = s.user_id
    WHERE s.plan <> 'free' AND s.is_institute = false
    ORDER BY s.ends_at DESC NULLS LAST LIMIT 200
  `);
}

/**
 * Student: { email, days, planId? } or { email, revoke: true }.
 * Institute: { kind: "institute", institutionId, planId, days } or revoke.
 * Institute grants are administrative overrides; payment activation must still
 * come from a separately verified provider event.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object" || Array.isArray(b)) return Response.json({ error: "Invalid request." }, { status: 400 });

  if (b.kind === "institute") {
    const institutionId = String(b.institutionId ?? "");
    const planId = String(b.planId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(institutionId)) return Response.json({ error: "Invalid institute." }, { status: 400 });
    if (!["institute_basic", "institute_growth"].includes(planId)) return Response.json({ error: "Choose an available institute plan." }, { status: 400 });
    const db = sql();
    const [institution] = await db`SELECT id FROM institutions WHERE id = ${institutionId}`;
    if (!institution) return Response.json({ error: "Institute not found." }, { status: 404 });
    if (b.revoke === true) {
      await db`UPDATE institute_subscriptions SET status = 'cancelled', ends_at = now() WHERE institute_id = ${institutionId} AND status = 'active'`;
      return Response.json({ ok: true });
    }
    const days = Number(b.days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) return Response.json({ error: "Days must be between 1 and 3650." }, { status: 400 });
    const plan = getInstitutePlan(planId as InstitutePlanId);
    if (!plan) return Response.json({ error: "Institute plan is not configured." }, { status: 400 });
    const [catalog] = await db`
      INSERT INTO institute_plans (plan_id, monthly_amount_paise, annual_amount_paise, max_student_seats, is_active)
      VALUES (${planId}, ${plan.monthlyAmountPaise}, ${plan.annualAmountPaise}, ${plan.maxStudentSeats}, true)
      ON CONFLICT (plan_id) DO UPDATE SET monthly_amount_paise = EXCLUDED.monthly_amount_paise,
        annual_amount_paise = EXCLUDED.annual_amount_paise, max_student_seats = EXCLUDED.max_student_seats, is_active = true
      RETURNING id
    `;
    const [current] = await db`
      SELECT id, ends_at FROM institute_subscriptions
      WHERE institute_id = ${institutionId} AND status = 'active'
      ORDER BY ends_at DESC NULLS LAST LIMIT 1
    `;
    const end = new Date(Math.max(Date.now(), current?.ends_at ? new Date(current.ends_at).getTime() : Date.now()) + days * 86400000).toISOString();
    if (current) {
      await db`UPDATE institute_subscriptions SET plan_id = ${catalog.id}, ends_at = ${end}, status = 'active', renewed_at = now() WHERE id = ${current.id}`;
    } else {
      await db`INSERT INTO institute_subscriptions (institute_id, plan_id, status, started_at, ends_at, renewed_at) VALUES (${institutionId}, ${catalog.id}, 'active', now(), ${end}, now())`;
    }
    return Response.json({ ok: true, endsAt: end });
  }

  const email = String(b.email ?? "").trim().toLowerCase();
  if (!email || email.length > 254) return Response.json({ error: "Enter a valid account email." }, { status: 400 });
  const [u] = await sql()`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (!u) return Response.json({ error: "No user with that email." }, { status: 404 });
  if (b.revoke === true) {
    for (const planId of paidPlanIds) await revokePro(u.id, planId);
    return Response.json({ ok: true });
  }
  const planId = String(b.planId ?? "student_pro_monthly") as StudentPlanId;
  if (!paidPlanIds.includes(planId)) return Response.json({ error: "Choose a valid paid student plan." }, { status: 400 });
  const days = Number(b.days);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return Response.json({ error: "Days must be between 1 and 3650." }, { status: 400 });
  return Response.json({ ok: true, endsAt: await grantPro(u.id, days, planId) });
}
