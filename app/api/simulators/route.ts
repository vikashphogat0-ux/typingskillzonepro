import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

/** Public list of exam simulators with their locked rules, how many students practise on each, and your best. */
export async function GET(req: Request) {
  const uid = await getUserId(req).catch(() => null);
  try {
    const rows = await sql()`SELECT et.slug, et.name, et.language, et.duration_sec, et.display_mode, et.backspace, et.description,
      et.scoring->>'unit' AS unit, et.scoring->>'qualifyingWpm' AS qualifying_wpm, et.scoring->>'maxErrorPercent' AS max_error_percent,
      (SELECT count(DISTINCT r.user_id) FROM results r WHERE r.template_id = et.id AND NOT r.flagged)::int AS participants,
      (SELECT max(r.net_wpm) FROM results r WHERE r.template_id = et.id AND r.user_id = ${uid}::uuid AND NOT r.flagged) AS my_best
      FROM exam_templates et WHERE et.is_active ORDER BY et.name`;
    return Response.json(rows);
  } catch { return Response.json([]); }
}
