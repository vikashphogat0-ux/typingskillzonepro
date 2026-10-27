import { sql } from "@/lib/db";

/** Public: active exam templates for the test setup page. */
export async function GET() {
  try {
    const rows = await sql()`
      SELECT t.slug, t.name, t.language, t.duration_sec, t.display_mode, t.backspace, t.scoring,
        (SELECT count(*)::int FROM results r WHERE r.template_id = t.id AND NOT r.flagged) AS participants
      FROM exam_templates t WHERE t.is_active ORDER BY t.name
    `;
    return Response.json(rows);
  } catch {
    return Response.json([]);
  }
}
