import { sql } from "@/lib/db";
import { PRESETS, getBuiltInPreset } from "@/lib/presets";
import { getRkcPassageLayout } from "@/lib/rkc-passage-format";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  try {
    const db = sql();
    const [t] = await db`SELECT slug, name, language, duration_sec, display_mode, backspace, scoring, description, passage_layout, enter_key_policy, tab_key_policy, font_size_pt, passage_font_family, passage_alignment, passage_line_spacing, passage_paragraph_spacing, print_page_size
      FROM exam_templates WHERE slug = ${slug} AND is_active = true`;
    if (!t) return Response.json({ error: "Simulator not found." }, { status: 404 });

    const verified = getBuiltInPreset(t.slug);
    return Response.json({
      slug: t.slug,
      name: t.name,
      language: t.language,
      duration_sec: verified?.durationSec ?? t.duration_sec,
      display_mode: verified?.mode ?? t.display_mode,
      backspace: verified?.backspace ?? (String(t.slug).startsWith("bsf-") ? "disabled" : String(t.slug).startsWith("dp-hcm-") ? "full" : t.backspace),
      scoring: verified?.profile ?? t.scoring,
      description: t.description,
      passage_layout: t.passage_layout || getRkcPassageLayout(String(t.slug)),
      passage_font_family: t.passage_font_family ?? "system",
      passage_alignment: t.passage_alignment ?? "left",
      passage_line_spacing: Number(t.passage_line_spacing ?? 1.5),
      passage_paragraph_spacing: Number(t.passage_paragraph_spacing ?? 8),
      print_page_size: t.print_page_size ?? "A4",
      formattingSettingsAvailable: true,
      enter_key_policy: t.enter_key_policy ?? "newline",
      tab_key_policy: t.tab_key_policy ?? "blocked",
      font_size_pt: t.font_size_pt ?? 12,
      participants: 0,
      my_best: null
    });
  } catch (error) {
    console.error("GET /api/simulators/[slug] failed; serving built-in preset as a temporary fallback:", error);
    {
      const preset = PRESETS.find((p) => p.slug === slug);
      if (!preset) return Response.json({ error: "Simulator not found." }, { status: 404 });
      return Response.json({ slug: preset.slug, name: preset.name, language: preset.lang, duration_sec: preset.durationSec, display_mode: preset.mode, backspace: preset.backspace, scoring: preset.profile ?? { id: preset.profileId }, description: "Temporary fallback: database-backed exam details are unavailable; saved results require the database.", passage_layout: getRkcPassageLayout(String(preset.slug)), passage_font_family: "system", passage_alignment: "left", passage_line_spacing: 1.5, passage_paragraph_spacing: 8, print_page_size: "A4", formattingSettingsAvailable: false, formattingWarning: "Showing default presentation settings because database settings could not be loaded. Check the database connection and apply the simulator passage-formatting migration.", enter_key_policy: "newline", tab_key_policy: "blocked", font_size_pt: 12, participants: 0, my_best: null });
  }
}