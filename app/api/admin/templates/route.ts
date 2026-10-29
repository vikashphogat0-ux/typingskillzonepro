import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validateTemplate, type TemplateInput } from "@/lib/adminValidation";

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
  const { errors, scoring } = validateTemplate(t);
  if (errors.length || !scoring) return Response.json({ error: errors.join(" ") }, { status: 422 });
  await sql()`INSERT INTO exam_templates (slug, name, language, duration_sec, display_mode, backspace, scoring, is_active)
    VALUES (${t.slug}, ${t.name.trim()}, ${t.language}, ${t.durationSec}, ${t.displayMode}, ${t.backspace}, ${JSON.stringify(scoring)}::jsonb, ${t.isActive ?? true})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, language = EXCLUDED.language, duration_sec = EXCLUDED.duration_sec,
      display_mode = EXCLUDED.display_mode, backspace = EXCLUDED.backspace, scoring = EXCLUDED.scoring, is_active = EXCLUDED.is_active`;
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing slug." }, { status: 400 });
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
