import { sql } from "@/lib/db";
import { requireStaff } from "@/lib/inst-server";

export async function GET(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  return Response.json(await sql()`SELECT b.id, b.name, coalesce((SELECT json_agg(bm.user_id) FROM batch_members bm WHERE bm.batch_id = b.id), '[]'::json) AS member_ids
    FROM batches b WHERE b.institution_id = ${c.m.institution_id} ORDER BY b.created_at DESC`);
}

/** { name } creates a batch. { batchId, userIds } sets who is in it. */
export async function POST(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const b = await req.json().catch(() => null);
  const db = sql();
  if (b?.batchId) {
    const [own] = await db`SELECT id FROM batches WHERE id = ${String(b.batchId)} AND institution_id = ${c.m.institution_id}`;
    if (!own) return Response.json({ error: "Batch not found." }, { status: 404 });
    const ids = JSON.stringify(Array.isArray(b.userIds) ? b.userIds.map(String).slice(0, 500) : []);
    await db`DELETE FROM batch_members WHERE batch_id = ${own.id}`;
    await db`INSERT INTO batch_members (batch_id, user_id) SELECT ${own.id}, im.user_id FROM institution_members im
      WHERE im.institution_id = ${c.m.institution_id} AND im.role = 'student' AND im.user_id::text IN (SELECT jsonb_array_elements_text(${ids}::jsonb))`;
    return Response.json({ ok: true });
  }
  const name = String(b?.name ?? "").trim().slice(0, 60);
  if (name.length < 2) return Response.json({ error: "Give the batch a name." }, { status: 400 });
  await db`INSERT INTO batches (institution_id, name) VALUES (${c.m.institution_id}, ${name})`;
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await sql()`DELETE FROM batches WHERE id = ${id} AND institution_id = ${c.m.institution_id}`;
  return Response.json({ ok: true });
}
