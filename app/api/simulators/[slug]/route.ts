import { sql } from "@/lib/db";
import { PRESETS, getVerifiedPreset } from "@/lib/presets";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  try {
    const db = sql();
    const [t] = await db`SELECT slug, name, language, duration_sec, display_mode, backspace, scoring, description
      FROM exam_templates WHERE slug = ${slug} AND is_active = true`;
    if (!t) return Response.json({ error: "Simulator not found." }, { status: 404 });

    const verified = getVerifiedPreset(t.slug);
    return Response.json({
      slug: t.slug,
      name: t.name,
      language: t.language,
      duration_sec: verified?.durationSec ?? t.duration_sec,
      display_mode: verified?.mode ?? t.display_mode,
      backspace: verified?.backspace ?? (String(t.slug).startsWith("bsf-") ? "disabled" : String(t.slug).startsWith("dp-hcm-") ? "full" : t.backspace),
      scoring: verified?.profile ?? t.scoring,
      description: t.description,
      participants: 0,
      my_best: null
    });
  } catch (error) {
    console.error("GET /api/simulators/[slug] failed; serving built-in preset as a temporary fallback:", error);
    {
      const preset = PRESETS.find((p) => p.slug === slug);
      if (!preset) return Response.json({ error: "Simulator not found." }, { status: 404 });
      return Response.json({ slug: preset.slug, name: preset.name, language: preset.lang, duration_sec: preset.durationSec, display_mode: preset.mode, backspace: preset.backspace, scoring: preset.profile ?? { id: preset.profileId }, description: "Temporary local fallback: database-backed exam details are unavailable; saved results require the database.", participants: 0, my_best: null });
    }
    console.error("GET /api/simulators/[slug] failed:", error);
    return Response.json({ error: "Simulator details are temporarily unavailable. Check the database connection and exam seed data." }, { status: 503 });
  }
}