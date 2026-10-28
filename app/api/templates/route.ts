import { sql } from "@/lib/db";
import { PRESETS } from "@/lib/presets";

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
    if (!process.env.DATABASE_URL) {
      // Keep local UI and practice setup usable before the developer configures Neon.
      return Response.json(PRESETS.map((p) => ({
        slug: p.slug, name: p.name, language: p.lang, duration_sec: p.durationSec,
        display_mode: p.mode, backspace: p.backspace, scoring: p.profile ?? { id: p.profileId },
        description: "Local preset. Configure DATABASE_URL to load the full database-backed catalogue and passages."
      })));
    }
    console.error("GET /api/templates failed:", error);
    return Response.json({ error: "Exam presets are temporarily unavailable. Check the database configuration and exam seed data." }, { status: 503 });
  }
}
