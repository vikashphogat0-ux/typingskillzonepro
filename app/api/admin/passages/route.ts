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
  const items = Array.isArray(b?.items) ? b.items.slice(0, 50) : [];
  if (!items.length) return Response.json({ error: "No passages sent." }, { status: 400 });
  const checked = items.map((it: any, i: number) => ({ i, ...validatePassage({ title: String(it.title ?? ""), language: it.language, body: String(it.body ?? "") }) }));
  const bad = checked.filter((c: any) => !c.ok);
  if (bad.length) return Response.json({ error: "Some passages need fixing.", problems: bad.map((c: any) => ({ index: c.i, errors: c.errors })) }, { status: 422 });
  const db = sql();
  const slug = b.templateSlug ? String(b.templateSlug) : null;
  for (const c of checked as any[]) {
    await db`INSERT INTO passages (template_id, language, title, body, word_count, created_by)
      VALUES ((SELECT id FROM exam_templates WHERE slug = ${slug}), ${c.clean.language}, ${c.clean.title}, ${c.clean.body}, ${countWords(c.clean.body)}, ${uid})`;
  }
  return Response.json({ ok: true, saved: checked.length });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  await sql()`DELETE FROM passages WHERE id = ${id}`;
  return Response.json({ ok: true });
}
