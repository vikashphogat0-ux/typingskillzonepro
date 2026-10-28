import { sql } from "@/lib/db";
import { PRESETS } from "@/lib/presets";

/** Public list of active exam simulators. Keep this endpoint independent of result-history columns. */
export async function GET() {
  try {
    const rows = await sql()`SELECT et.slug, et.name, et.language, et.duration_sec, et.display_mode, et.backspace, et.description, et.scoring
      FROM exam_templates et
      WHERE et.is_active = true
      ORDER BY et.name`;
    return Response.json(rows);
  } catch (error) {
    console.error("GET /api/simulators failed; serving built-in exam presets as a temporary fallback:", error);
    {
      // Keep local UI and practice setup usable before the developer configures Neon.
      return Response.json(PRESETS.map((p) => ({
        slug: p.slug, name: p.name, language: p.lang, duration_sec: p.durationSec,
        display_mode: p.mode, backspace: p.backspace, scoring: p.profile ?? { id: p.profileId },
        description: "Temporary local fallback: database-backed exam catalogue is unavailable; results and saved history require the database."
      })));
    }
    console.error("GET /api/simulators failed:", error);
    return Response.json({ error: "Exam catalogue is temporarily unavailable. Check the database configuration and exam seed data." }, { status: 503 });
  }
}
