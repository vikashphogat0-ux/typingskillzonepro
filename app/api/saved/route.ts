import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in required." }, { status: 401 });
  const rows = await sql()`
    SELECT p.id, p.title, p.language, p.word_count, left(p.body,140) AS preview, sp.saved_at,
           et.name AS exam, et.slug AS exam_slug
    FROM saved_passages sp
    JOIN passages p ON p.id = sp.passage_id
    LEFT JOIN exam_templates et ON et.id = p.template_id
    WHERE sp.user_id = ${uid}
    ORDER BY sp.saved_at DESC`;
  return Response.json(rows);
}

export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { passageId } = await req.json().catch(() => ({} as any));
  if (!/^[0-9a-f-]{36}$/i.test(String(passageId ?? "")))
    return Response.json({ error: "Invalid passage." }, { status: 400 });
  try {
    await sql()`INSERT INTO saved_passages (user_id, passage_id) VALUES (${uid}, ${passageId}) ON CONFLICT DO NOTHING`;
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Could not save passage." }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in required." }, { status: 401 });
  const passageId = new URL(req.url).searchParams.get("passageId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(passageId))
    return Response.json({ error: "Invalid passage." }, { status: 400 });
  await sql()`DELETE FROM saved_passages WHERE user_id = ${uid} AND passage_id = ${passageId}`;
  return Response.json({ ok: true });
}
