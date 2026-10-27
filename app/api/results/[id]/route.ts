import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getMembership } from "@/lib/inst-server";
import { isStaff } from "@/lib/institution";
import { calculateScore, PROFILES } from "@/lib/wpmCalculator";

/** One attempt in full: the score is recomputed from the stored text, so it always matches the rules used. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to see this result." }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const db = sql();
  const [r] = await db`SELECT r.*, et.name AS sim_name, et.slug AS sim_slug, et.scoring AS tpl_scoring, t.duration_sec, u.name AS student_name
    FROM results r LEFT JOIN exam_templates et ON et.id = r.template_id LEFT JOIN tests t ON t.id = r.test_id JOIN users u ON u.id = r.user_id WHERE r.id = ${id}`;
  if (!r) return Response.json({ error: "Not found." }, { status: 404 });
  let viewingStudent = false;
  if (r.user_id !== uid) {
    const m = await getMembership(uid);
    const same = m && isStaff(m.role) && (await db`SELECT 1 FROM institution_members WHERE institution_id = ${m.institution_id} AND user_id = ${r.user_id}`).length > 0;
    if (!same) return Response.json({ error: "Not found." }, { status: 404 });
    viewingStudent = true;
  }
  if (!r.typed_text || !r.reference_text) return Response.json({ error: "Detailed comparison was not stored for this older result." }, { status: 404 });
  const profile = r.breakdown?.profile ?? r.tpl_scoring ?? PROFILES.practice;
  const duration = r.duration_sec ?? 600;
  const score = calculateScore({ reference: r.reference_text, typed: r.typed_text, elapsedSec: Number(r.elapsed_sec) || duration, durationSec: duration, profile, keyEvents: r.keystrokes ?? undefined });
  let rank: number | null = null, participants: number | null = null;
  if (r.template_id && !r.flagged) {
    const [k] = await db`WITH best AS (
        SELECT DISTINCT ON (r2.user_id) r2.net_wpm FROM results r2 JOIN tests t2 ON t2.id = r2.test_id
        WHERE r2.template_id = ${r.template_id} AND NOT r2.flagged AND r2.elapsed_sec >= 0.9 * t2.duration_sec
        ORDER BY r2.user_id, r2.net_wpm DESC)
      SELECT (count(*) FILTER (WHERE net_wpm > ${r.net_wpm}) + 1)::int AS rank, count(*)::int AS participants FROM best`;
    rank = k.rank; participants = k.participants;
  }
  return Response.json({ reference: r.reference_text, typed: r.typed_text, events: r.keystrokes ?? [], score, durationSec: duration, createdAt: r.created_at,
    simulator: r.sim_slug ? { slug: r.sim_slug, name: r.sim_name } : null, flagged: r.flagged, rank, participants, studentName: viewingStudent ? r.student_name : null });
}
