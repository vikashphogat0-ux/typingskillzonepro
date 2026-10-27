import { sql } from "@/lib/db";
import { requireStaff, studentRows } from "@/lib/inst-server";

/** Students with progress. ?userId=... returns that student's recent attempts. */
export async function GET(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return Response.json(await studentRows(c.m.institution_id));
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ error: "Not found." }, { status: 404 });
  const rows = await sql()`SELECT r.id, r.created_at, r.net_wpm, r.accuracy, r.flagged, et.name AS simulator
    FROM results r LEFT JOIN exam_templates et ON et.id = r.template_id
    WHERE r.user_id = ${userId} AND EXISTS (SELECT 1 FROM institution_members WHERE institution_id = ${c.m.institution_id} AND user_id = ${userId})
    ORDER BY r.created_at DESC LIMIT 30`;
  return Response.json(rows);
}
