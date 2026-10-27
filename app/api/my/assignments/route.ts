import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

/** Tests my institute has set for me, with my best score so far. */
export async function GET(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in first." }, { status: 401 });
  return Response.json(await sql()`SELECT a.id, a.title, a.due_at, et.slug AS sim_slug, et.name AS sim_name, b.name AS batch_name,
      (SELECT max(r.net_wpm) FROM results r WHERE r.assignment_id = a.id AND r.user_id = ${uid} AND NOT r.flagged) AS my_best,
      (SELECT count(*) FROM results r WHERE r.assignment_id = a.id AND r.user_id = ${uid})::int AS attempts
    FROM assignments a JOIN institution_members im ON im.institution_id = a.institution_id AND im.user_id = ${uid}
    JOIN institutions i ON i.id = a.institution_id AND i.status = 'approved'
    JOIN exam_templates et ON et.id = a.template_id LEFT JOIN batches b ON b.id = a.batch_id
    WHERE a.batch_id IS NULL OR a.batch_id IN (SELECT batch_id FROM batch_members WHERE user_id = ${uid})
    ORDER BY a.due_at NULLS LAST, a.created_at DESC LIMIT 50`);
}
