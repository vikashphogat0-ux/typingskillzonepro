import { sql } from "@/lib/db";

/** Public: active exam templates for the test setup page. */
export async function GET() {
  try {
    const rows = await sql()`
      SELECT t.slug, t.name, t.language, t.duration_sec, t.display_mode, t.backspace, t.scoring
      FROM exam_templates t
      WHERE t.is_active = true
      ORDER BY t.name
    `;
    return Response.json(rows);
  } catch (error) {
    console.error("GET /api/templates failed:", error);
    return Response.json({ error: "Exam presets are temporarily unavailable. Check the database configuration and exam seed data." }, { status: 503 });
  }
}
