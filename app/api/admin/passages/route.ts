import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { countWords, validatePassage } from "@/lib/adminValidation";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const rows = await sql()`WITH numbered AS (
      SELECT p.id, p.title, p.language, p.word_count, p.created_at, left(p.body, 120) AS preview,
        p.template_id, row_number() OVER (PARTITION BY p.template_id, p.language ORDER BY p.created_at, p.id) AS passage_number
      FROM passages p
    )
    SELECT n.id, n.title, n.language, n.word_count, n.created_at, n.preview,
      t.slug AS template, COALESCE(t.name, 'General library') AS template_name,
      COALESCE(t.passage_layout, 'continuous') AS passage_layout,
      COALESCE(t.font_size_pt, 12) AS font_size_pt, n.passage_number
    FROM numbered n LEFT JOIN exam_templates t ON t.id = n.template_id
    ORDER BY template_name, n.language, n.passage_number LIMIT 1000`;
  return Response.json(rows);
}

/**
 * Body: { items: [{title, language, body}], templateSlugs?: string[] }.
 * One source passage is copied into each selected exam's passage directory.
 * The complete batch is committed atomically.
 */
export async function POST(req: Request) {
  const uid = await requireAdmin(req);
  if (!uid) return deny();
  const b = await req.json().catch(() => null);
  if (!Array.isArray(b?.items) || !b.items.length) return Response.json({ error: "Send between 1 and 50 passages." }, { status: 400 });
  if (b.items.length > 50) return Response.json({ error: "Upload at most 50 passages per batch." }, { status: 413 });

  const slug = typeof b.templateSlug === "string" ? b.templateSlug.trim() : "";
  if (!slug) return Response.json({ error: "Choose exactly one simulator folder before uploading passages." }, { status: 400 });

  const checked = b.items.map((it: any, i: number) => {
    const item = it && typeof it === "object" && !Array.isArray(it) ? it : {};
    return { i, ...validatePassage({ title: String(item.title ?? ""), language: item.language, body: String(item.body ?? "") }) };
  });
  const bad = checked.filter((c: any) => !c.ok);
  if (bad.length) return Response.json({ error: "Some passages need fixing.", problems: bad.map((c: any) => ({ index: c.i, errors: c.errors })) }, { status: 422 });

  try {
    const db = sql();
    const languages = new Set(checked.map((item: any) => item.clean.language));
    if (languages.size !== 1) return Response.json({ error: "All passages in one upload batch must use the same language." }, { status: 422 });
    const [template] = await db`SELECT id, slug, name, language, passage_layout, font_size_pt FROM exam_templates WHERE slug = ${slug} AND is_active = true LIMIT 1`;
    if (!template) return Response.json({ error: `The selected exam directory "${slug}" does not exist or is inactive.` }, { status: 422 });
    const destination = { id: String(template.id), slug: String(template.slug), name: String(template.name), language: String(template.language) };
    const language = checked[0].clean.language;
    if (destination.language !== language) return Response.json({ error: `Passage language does not match ${destination.name}. Select ${destination.language === "hi" ? "Hindi" : "English"}.` }, { status: 422 });

    const basePayload = checked.map((item: any) => ({
      language: item.clean.language,
      title: item.clean.title,
      body: item.clean.body,
      word_count: countWords(item.clean.body),
    }));
    const payload = basePayload.map((item: any) => {
      const match = /^Passage\\s+(\\d+)$/i.exec(item.title.trim());
      const title = match ? `${destination.name} — Passage ${String(Number(match[1])).padStart(2, "0")}` : item.title;
      return { ...item, title: title.slice(0, 120) };
    });
    const inserted = await db`
      INSERT INTO passages (template_id, language, title, body, word_count, created_by, format_metadata)
      SELECT ${destination.id}::uuid, item.language, item.title, item.body, item.word_count, ${uid},
        ${JSON.stringify({ simulatorSlug: destination.slug, examSpecific: true })}::jsonb
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
        AS item(language text, title text, body text, word_count integer)
      RETURNING id
    `;
    const insertedCount = inserted.length;
    const expected = basePayload.length;
    if (insertedCount !== expected) return Response.json({ error: "Passage publication was incomplete. Refresh before retrying.", saved: 0 }, { status: 500 });
    return Response.json({ ok: true, saved: basePayload.length, publications: insertedCount, directory: destination.slug });
  } catch (error) {
    console.error("POST /api/admin/passages multi-directory save failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return Response.json({ error: "Passage upload failed. " + detail.slice(0, 300) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const url = new URL(req.url);
  const ids = [...new Set(url.searchParams.getAll("id").concat((url.searchParams.get("ids") ?? "").split(",")).map(x => x.trim()).filter(Boolean))];
  if (!ids.length || ids.length > 200 || ids.some(id => !/^[0-9a-f-]{36}$/i.test(id))) return Response.json({ error: "Select between 1 and 200 valid passage IDs." }, { status: 400 });
  try {
    const db = sql();
    const used = await db`SELECT DISTINCT passage_id FROM tests WHERE passage_id = ANY(${ids}::uuid[])`;
    if (used.length) return Response.json({ error: `${used.length} selected passage(s) are attached to test history and cannot be deleted. Remove them from selection and retry.`, protectedIds: used.map((x:any) => x.passage_id) }, { status: 409 });
    const deleted = await db`DELETE FROM passages WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
    return Response.json({ ok: true, deleted: deleted.length });
  } catch (error) {
    console.error("DELETE /api/admin/passages failed:", error);
    return Response.json({ error: "Passages could not be deleted. Check whether they are in use." }, { status: 409 });
  }
}
