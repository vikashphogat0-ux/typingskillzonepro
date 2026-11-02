import { sql } from "./db";
import { getUserId } from "./auth";
import { isStaff, type Role } from "./institution";

export interface Membership { institution_id: string; role: Role; status: string; name: string; join_code: string }

export async function getMembership(uid: string): Promise<Membership | null> {
  const [m] = await sql()`SELECT im.institution_id, im.role, i.status, i.name, i.join_code
    FROM institution_members im JOIN institutions i ON i.id = im.institution_id WHERE im.user_id = ${uid}`;
  return (m as Membership) ?? null;
}

export type StaffCheck = { ok: true; uid: string; m: Membership } | { ok: false; res: Response };
const fail = (msg: string, status: number): StaffCheck => ({ ok: false, res: Response.json({ error: msg }, { status }) });

/** Owner or teacher of an APPROVED institution. */
export async function requireStaff(req: Request): Promise<StaffCheck> {
  const uid = await getUserId(req);
  if (!uid) return fail("Sign in first.", 401);
  const m = await getMembership(uid);
  if (!m || !isStaff(m.role)) return fail("This is for institute teachers and owners.", 403);
  if (m.status !== "approved") return fail("Your institute is waiting for approval.", 403);
  return { ok: true, uid, m };
}

/** Add a student only when an active institute plan has an unused seat. */
export async function addInstituteStudent(institutionId: string, userId: string) {
  const [result] = await sql() `
    WITH locked AS MATERIALIZED (
      SELECT id FROM institutions WHERE id = ${institutionId} AND status = 'approved' FOR UPDATE
    ),
    entitlement AS MATERIALIZED (
      SELECT p.max_student_seats + COALESCE((
        SELECT SUM(a.quantity * 50)::int FROM add_on_purchases a
        WHERE a.institute_id = s.institute_id AND a.add_on_id = 'additional_50_seats'
          AND a.status = 'verified' AND (a.valid_until IS NULL OR a.valid_until > now())
      ), 0) AS seat_limit
      FROM institute_subscriptions s JOIN institute_plans p ON p.id = s.plan_id AND p.is_active = true
      JOIN locked l ON l.id = s.institute_id
      WHERE s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > now())
      ORDER BY s.ends_at DESC NULLS LAST, s.started_at DESC LIMIT 1
    ),
    usage AS MATERIALIZED (
      SELECT count(*)::int AS used FROM institution_members im JOIN locked l ON l.id = im.institution_id
      WHERE im.role = 'student'
    ),
    inserted AS (
      INSERT INTO institution_members (institution_id, user_id, role)
      SELECT l.id, ${userId}, 'student' FROM locked l CROSS JOIN entitlement e CROSS JOIN usage u
      WHERE u.used < e.seat_limit ON CONFLICT (user_id) DO NOTHING RETURNING user_id
    )
    SELECT (SELECT seat_limit FROM entitlement) AS seat_limit,
           (SELECT used FROM usage) AS used, (SELECT count(*)::int FROM inserted) AS inserted
  `;
  return { added: Number(result?.inserted ?? 0) === 1, hasActivePlan: result?.seat_limit !== null && result?.seat_limit !== undefined, seatLimit: Number(result?.seat_limit ?? 0), seatsUsed: Number(result?.used ?? 0) };
}
export async function studentRows(institutionId: string) {
  return sql()`SELECT u.id, u.name, u.email,
    (SELECT coalesce(string_agg(b.name, '; '), '') FROM batch_members bm JOIN batches b ON b.id = bm.batch_id WHERE bm.user_id = u.id AND b.institution_id = ${institutionId}) AS batches,
    (SELECT count(*) FROM results r WHERE r.user_id = u.id)::int AS tests,
    (SELECT max(r.net_wpm) FROM results r WHERE r.user_id = u.id AND NOT r.flagged) AS best_wpm,
    (SELECT round(avg(x.accuracy), 1) FROM (SELECT accuracy FROM results WHERE user_id = u.id ORDER BY created_at DESC LIMIT 10) x) AS recent_accuracy,
    (SELECT count(DISTINCT (r.created_at AT TIME ZONE 'Asia/Kolkata')::date) FROM results r WHERE r.user_id = u.id AND r.created_at > now() - interval '30 days')::int AS active_days_30,
    (SELECT max(r.created_at) FROM results r WHERE r.user_id = u.id) AS last_active
    FROM institution_members im JOIN users u ON u.id = im.user_id
    WHERE im.institution_id = ${institutionId} AND im.role = 'student' ORDER BY u.name`;
}
