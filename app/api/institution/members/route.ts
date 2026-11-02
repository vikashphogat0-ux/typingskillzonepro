import { sql } from "@/lib/db";
import { addInstituteStudent, requireStaff } from "@/lib/inst-server";
import { canManageTeam } from "@/lib/institution";

/** Add a student or teacher by email. The person must have signed up on the site first. */
export async function POST(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const b = await req.json().catch(() => null);
  const role = b?.role === "teacher" ? "teacher" : "student";
  if (role === "teacher" && !canManageTeam(c.m.role)) return Response.json({ error: "Only the owner can add teachers." }, { status: 403 });
  const email = String(b?.email ?? "").trim().toLowerCase();
  const [u] = await sql()`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (!u) return Response.json({ error: "No account with that email. Ask them to sign up first, or share your join code." }, { status: 404 });
  if (role === "teacher") {
    const [plan] = await sql()`
      SELECT ip.plan_id
      FROM institute_subscriptions ins
      JOIN institute_plans ip ON ip.id = ins.plan_id AND ip.is_active = true
      WHERE ins.institute_id = ${c.m.institution_id}
        AND ins.status = 'active' AND (ins.ends_at IS NULL OR ins.ends_at > now())
      ORDER BY ins.ends_at DESC NULLS LAST LIMIT 1
    `;
    if (!plan) return Response.json({ error: "An active institute subscription is required before adding teachers." }, { status: 402 });
    if (plan.plan_id !== "institute_growth") return Response.json({ error: "Multiple teachers are available on the Institute Growth plan." }, { status: 403 });
  }
  if (role === "student") {
    const enrollment = await addInstituteStudent(c.m.institution_id, u.id);
    if (!enrollment.added) {
      if (!enrollment.hasActivePlan) return Response.json({ error: "An active institute subscription is required before enrolling students." }, { status: 402 });
      if (enrollment.seatsUsed >= enrollment.seatLimit) return Response.json({ error: `Student seat limit reached (${enrollment.seatsUsed}/${enrollment.seatLimit}). Upgrade the institute plan or add seats.` }, { status: 409 });
      return Response.json({ error: "That person already belongs to an institute." }, { status: 409 });
    }
    return Response.json({ ok: true });
  }
  try { await sql()`INSERT INTO institution_members (institution_id, user_id, role) VALUES (${c.m.institution_id}, ${u.id}, ${role})`; }
  catch { return Response.json({ error: "That person already belongs to an institute." }, { status: 409 }); }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const userId = new URL(req.url).searchParams.get("userId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ error: "Not found." }, { status: 404 });
  const [t] = await sql()`SELECT role FROM institution_members WHERE institution_id = ${c.m.institution_id} AND user_id = ${userId}`;
  if (!t || t.role === "owner") return Response.json({ error: "That member cannot be removed." }, { status: 400 });
  if (t.role === "teacher" && !canManageTeam(c.m.role)) return Response.json({ error: "Only the owner can remove teachers." }, { status: 403 });
  await sql()`DELETE FROM batch_members WHERE user_id = ${userId} AND batch_id IN (SELECT id FROM batches WHERE institution_id = ${c.m.institution_id})`;
  await sql()`DELETE FROM institution_members WHERE institution_id = ${c.m.institution_id} AND user_id = ${userId}`;
  return Response.json({ ok: true });
}
