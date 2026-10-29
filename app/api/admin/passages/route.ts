import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { countWords, validatePassage } from "@/lib/adminValidation";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const rows = await sql()`SELECT p.id, p.title, p.language, p.word_count, p.created_at, left(p.body, 90) AS preview, t.slug AS template
    FROM passages p LEFT JOIN exam_templates t ON t.id = p.template_id ORDER BY p.created_at DESC LIMIT 200`;
  return Response.json(rows);
}

/** Body: { items: [{title, language, body}], templateSlug? } (1 to 50 passages). Saves only if every item is valid. */
export async function POST(req: Request) {
  const uid = await requireAdmin(req);
  if (!uid) return deny();
  const b = await req.json().catch(() => null);
  if (!Array.isArray(b?.items) || !b.items.length) return Response.json({ error: "Send between 1 and 50 passages." }, { status: 400 });
  if (b.items.length > 50) return Response.json({ error: "Upload at most 50 passages per batch." }, { status: 413 });
  const items = b.items;
  const checked = items.map((it: any, i: number) => {
    const item = it && typeof it === "object" && !Array.isArray(it) ? it : {};
    return { i, ...validatePassage({ title: String(item.title ?? ""), language: item.language, body: String(item.body ?? "") }) };
  });
  const bad = checked.filter((c: any) => !c.ok);
  if (bad.length) return Response.json({ error: "Some passages need fixing.", problems: bad.map((c: any) => ({ index: c.i, errors: c.errors })) }, { status: 422 });
  const db = sql();
  const slug = b.templateSlug ? String(b.templateSlug).trim() : null;
  if (slug) {
    const [template] = await db`SELECT id FROM exam_templates WHERE slug = ${slug} LIMIT 1`;
    if (!template) return Response.json({ error: "The selected exam template does not exist." }, { status: 422 });
  }
  const payload = checked.map((item: any) => ({
    language: item.clean.language,
    title: item.clean.title,
    body: item.clean.body,
    word_count: countWords(item.clean.body),
  }));
  // A single INSERT is atomic: the batch is either fully stored or not stored.
  const inserted = await db`
    INSERT INTO passages (template_id, language, title, body, word_count, created_by)
    SELECT (SELECT id FROM exam_templates WHERE slug = ${slug}), item.language, item.title, item.body, item.word_count, ${uid}
    FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
      AS item(language text, title text, body text, word_count integer)
    RETURNING id
  `;
  return Response.json({ ok: true, saved: inserted.length });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  try {
    const [referenced] = await sql()`SELECT 1 AS used FROM tests WHERE passage_id = ${id} LIMIT 1`;
    if (referenced) {
      return Response.json({ error: "This passage is attached to a test record and cannot be deleted safely." }, { status: 409 });
    }
    const deleted = await sql()`DELETE FROM passages WHERE id = ${id} RETURNING id`;
    if (!deleted.length) return Response.json({ error: "Passage not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/passages failed:", error);
    return Response.json({ error: "Passage could not be deleted. Check whether it is in use." }, { status: 409 });
  }
}
