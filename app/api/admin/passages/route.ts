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

  const rawSlugs = Array.isArray(b.templateSlugs) ? b.templateSlugs : (b.templateSlug ? [b.templateSlug] : []);
  const slugs = [...new Set(rawSlugs.map((s: unknown) => String(s).trim()).filter(Boolean))];
  if (slugs.length > 40) return Response.json({ error: "Select at most 40 exam directories per upload." }, { status: 400 });

  const checked = b.items.map((it: any, i: number) => {
    const item = it && typeof it === "object" && !Array.isArray(it) ? it : {};
    return { i, ...validatePassage({ title: String(item.title ?? ""), language: item.language, body: String(item.body ?? "") }) };
  });
  const bad = checked.filter((c: any) => !c.ok);
  if (bad.length) return Response.json({ error: "Some passages need fixing.", problems: bad.map((c: any) => ({ index: c.i, errors: c.errors })) }, { status: 422 });

  try {
    const db = sql();
    const targetTemplates: { id: string; slug: string; language: string }[] = [];
    for (const slug of slugs) {
      const [template] = await db`SELECT id, slug, language FROM exam_templates WHERE slug = ${slug} AND is_active = true LIMIT 1`;
      if (!template) return Response.json({ error: `The selected exam directory "${slug}" does not exist or is inactive.` }, { status: 422 });
      targetTemplates.push({ id: String(template.id), slug: String(template.slug), language: String(template.language) });
    }
    const language = checked[0].clean.language;
    const wrongLanguage = targetTemplates.filter((template) => template.language !== language);
    if (wrongLanguage.length) return Response.json({ error: `Passage language does not match these exam directories: ${wrongLanguage.map((x) => x.slug).join(", ")}. Select only ${language === "hi" ? "Hindi" : "English"} directories.` }, { status: 422 });

    const payload = checked.map((item: any) => ({
      language: item.clean.language,
      title: item.clean.title,
      body: item.clean.body,
      word_count: countWords(item.clean.body),
    }));
    const destinations: (string | null)[] = targetTemplates.length ? targetTemplates.map((template) => template.id) : [null];
    const statements = destinations.map((templateId) => db`
      INSERT INTO passages (template_id, language, title, body, word_count, created_by)
      SELECT ${templateId}::uuid, item.language, item.title, item.body, item.word_count, ${uid}
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
        AS item(language text, title text, body text, word_count integer)
      RETURNING id
    `);
    const insertedBatches = await db.transaction(statements);
    const insertedCount = insertedBatches.reduce((total: number, rows: any) => total + rows.length, 0);
    const expected = payload.length * destinations.length;
    if (insertedCount !== expected) {
      console.error("Multi-directory passage insert count mismatch", { expected, insertedCount });
      return Response.json({ error: "Passage publication was incomplete. Refresh the passage list before retrying.", saved: 0 }, { status: 500 });
    }
    return Response.json({ ok: true, saved: payload.length, publications: insertedCount, directories: targetTemplates.map((x) => x.slug) });
  } catch (error) {
    console.error("POST /api/admin/passages multi-directory save failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return Response.json({ error: "Passage upload failed. " + detail.slice(0, 300) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  try {
    const [referenced] = await sql()`SELECT 1 AS used FROM tests WHERE passage_id = ${id} LIMIT 1`;
    if (referenced) return Response.json({ error: "This passage is attached to a test record and cannot be deleted safely." }, { status: 409 });
    const deleted = await sql()`DELETE FROM passages WHERE id = ${id} RETURNING id`;
    if (!deleted.length) return Response.json({ error: "Passage not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/passages failed:", error);
    return Response.json({ error: "Passage could not be deleted. Check whether it is in use." }, { status: 409 });
  }
}
