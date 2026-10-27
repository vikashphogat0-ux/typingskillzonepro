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
