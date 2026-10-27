import { sql } from "@/lib/db";
import { requireStaff } from "@/lib/inst-server";

/** List with completion numbers. ?id=... gives every assigned student's best score and attempts. */
export async function GET(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const db = sql(), inst = c.m.institution_id;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
    const [a] = await db`SELECT id, batch_id FROM assignments WHERE id = ${id} AND institution_id = ${inst}`;
    if (!a) return Response.json({ error: "Not found." }, { status: 404 });
    return Response.json(await db`SELECT u.id, u.name, u.email, max(r.net_wpm) FILTER (WHERE NOT r.flagged) AS best_wpm, count(r.id)::int AS attempts,
        (array_agg(r.id ORDER BY r.net_wpm DESC))[1] AS best_result_id
      FROM institution_members im JOIN users u ON u.id = im.user_id LEFT JOIN results r ON r.user_id = u.id AND r.assignment_id = ${id}
      WHERE im.institution_id = ${inst} AND im.role = 'student' AND (${a.batch_id}::uuid IS NULL OR im.user_id IN (SELECT user_id FROM batch_members WHERE batch_id = ${a.batch_id}::uuid))
      GROUP BY u.id ORDER BY u.name`);
  }
  return Response.json(await db`SELECT a.id, a.title, a.due_at, a.created_at, et.slug AS sim_slug, et.name AS sim_name, b.name AS batch_name,
      (SELECT count(*) FROM institution_members im WHERE im.institution_id = a.institution_id AND im.role = 'student' AND (a.batch_id IS NULL OR im.user_id IN (SELECT user_id FROM batch_members WHERE batch_id = a.batch_id)))::int AS assigned,
      (SELECT count(DISTINCT r.user_id) FROM results r WHERE r.assignment_id = a.id)::int AS completed,
      (SELECT round(avg(r.net_wpm), 1) FROM results r WHERE r.assignment_id = a.id AND NOT r.flagged) AS avg_wpm
    FROM assignments a JOIN exam_templates et ON et.id = a.template_id LEFT JOIN batches b ON b.id = a.batch_id
    WHERE a.institution_id = ${inst} ORDER BY a.created_at DESC LIMIT 100`);
}

export async function POST(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const b = await req.json().catch(() => null);
  const title = String(b?.title ?? "").trim().slice(0, 100);
  if (title.length < 3) return Response.json({ error: "Give the assignment a title." }, { status: 400 });
  const db = sql();
  const [t] = await db`SELECT id FROM exam_templates WHERE slug = ${String(b?.templateSlug ?? "")} AND is_active`;
  if (!t) return Response.json({ error: "Choose a simulator." }, { status: 400 });
  let batchId: string | null = null;
  if (b.batchId) {
    const [own] = await db`SELECT id FROM batches WHERE id = ${String(b.batchId)} AND institution_id = ${c.m.institution_id}`;
    if (!own) return Response.json({ error: "Batch not found." }, { status: 404 });
    batchId = own.id;
  }
  const due = b.dueAt ? new Date(b.dueAt) : null;
  if (due && Number.isNaN(due.getTime())) return Response.json({ error: "Due date is not valid." }, { status: 400 });
  await db`INSERT INTO assignments (institution_id, batch_id, template_id, title, due_at, created_by) VALUES (${c.m.institution_id}, ${batchId}, ${t.id}, ${title}, ${due ? due.toISOString() : null}, ${c.uid})`;
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await sql()`DELETE FROM assignments WHERE id = ${id} AND institution_id = ${c.m.institution_id}`;
  return Response.json({ ok: true });
}
