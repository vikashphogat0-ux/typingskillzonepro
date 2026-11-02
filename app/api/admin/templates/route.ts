import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validateTemplate, type TemplateInput } from "@/lib/adminValidation";
import { getBuiltInPreset } from "@/lib/presets";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  return Response.json(await sql()`SELECT * FROM exam_templates ORDER BY name`);
}

/** Create or update by slug. */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const t = (await req.json().catch(() => null)) as TemplateInput | null;
  if (!t) return Response.json({ error: "Invalid request." }, { status: 400 });
  const builtIn = getBuiltInPreset(String(t.slug));
  const { errors, scoring } = validateTemplate(t);
  if (builtIn && t.presentationOnly === true) {
    if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 422 });
    await sql()`UPDATE exam_templates SET
      passage_layout = ${t.passageLayout ?? "source-preserved"},
      font_size_pt = ${t.fontSizePt ?? 12},
      passage_font_family = ${t.passageFontFamily ?? "system"},
      passage_alignment = ${t.passageAlignment ?? "left"},
      passage_line_spacing = ${t.passageLineSpacing ?? 1.5},
      passage_paragraph_spacing = ${t.passageParagraphSpacing ?? 8},
      print_page_size = ${t.printPageSize ?? "A4"}
      WHERE slug = ${t.slug}`;
    return Response.json({ ok: true, presentationOnly: true });
  }
  if (builtIn && t.allowBuiltInRuleEdit !== true) return Response.json({ error: "Confirm full built-in simulator rule editing before saving." }, { status: 409 });
  if (errors.length || !scoring) return Response.json({ error: errors.join(" ") }, { status: 422 });
  await sql()`INSERT INTO exam_templates (
      slug, name, language, duration_sec, display_mode, backspace, scoring, is_active,
      passage_layout, font_size_pt, passage_font_family, passage_alignment,
      passage_line_spacing, passage_paragraph_spacing, print_page_size, enter_key_policy, tab_key_policy
    )
    VALUES (
      ${t.slug}, ${t.name.trim()}, ${t.language}, ${t.durationSec}, ${t.displayMode}, ${t.backspace},
      ${JSON.stringify(scoring)}::jsonb, ${t.isActive ?? true},
      ${t.passageLayout ?? "continuous"}, ${t.fontSizePt ?? 12}, ${t.passageFontFamily ?? "system"},
      ${t.passageAlignment ?? "left"}, ${t.passageLineSpacing ?? 1.5},
      ${t.passageParagraphSpacing ?? 8}, ${t.printPageSize ?? "A4"},
      ${t.enterKeyPolicy ?? "newline"}, ${t.tabKeyPolicy ?? "blocked"}
    )
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
      display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace, scoring = EXCLUDED.scoring, is_active = EXCLUDED.is_active,
      passage_layout = EXCLUDED.passage_layout, font_size_pt = EXCLUDED.font_size_pt,
      passage_font_family = EXCLUDED.passage_font_family, passage_alignment = EXCLUDED.passage_alignment,
      passage_line_spacing = EXCLUDED.passage_line_spacing, passage_paragraph_spacing = EXCLUDED.passage_paragraph_spacing,
      print_page_size = EXCLUDED.print_page_size, enter_key_policy = EXCLUDED.enter_key_policy,
      tab_key_policy = EXCLUDED.tab_key_policy`;
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing slug." }, { status: 400 });
  if (getBuiltInPreset(slug)) return Response.json({ error: "Built-in exam presets cannot be deleted. Deactivate or delete only custom templates." }, { status: 409 });
  try {
    const db = sql();
    const [template] = await db`SELECT id FROM exam_templates WHERE slug = ${slug} LIMIT 1`;
    if (!template) return Response.json({ error: "Exam template not found." }, { status: 404 });
    const [used] = await db`SELECT 1 AS used FROM tests WHERE template_id = ${template.id} LIMIT 1`;
    if (used) {
      return Response.json({ error: "This exam template is attached to test history and cannot be deleted safely. Deactivate it instead." }, { status: 409 });
    }
    await db`DELETE FROM exam_templates WHERE id = ${template.id}`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/templates failed:", error);
    return Response.json({ error: "Exam template could not be deleted. Deactivate it if it is already in use." }, { status: 409 });
  }
}
