import { sql } from "@/lib/db";

/** Public list of active exam simulators. Keep this endpoint independent of result-history columns. */
export async function GET() {
  try {
    const rows = await sql()`SELECT et.slug, et.name, et.language, et.duration_sec, et.display_mode, et.backspace, et.description, et.scoring
      FROM exam_templates et
      WHERE et.is_active = true
      ORDER BY et.name`;
    return Response.json(rows);
  } catch (error) {
    console.error("GET /api/simulators failed:", error);
    return Response.json({ error: "Exam catalogue is temporarily unavailable. Check the database configuration and exam seed data." }, { status: 503 });
  }
}
