import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const db = sql();
    const [t] = await db`SELECT id, slug, name, language, duration_sec, display_mode, backspace, scoring, description FROM exam_templates WHERE slug = ${slug} AND is_active`;
    if (!t) return Response.json({ error: "Exam not found." }, { status: 404 });
    const [p] = await db`SELECT count(DISTINCT user_id)::int AS participants FROM results WHERE template_id = ${t.id} AND NOT flagged`;
    const uid = await getUserId(req).catch(() => null);
    let myBest = null;
    if (uid) {
      const [b] = await db`SELECT max(net_wpm) AS best FROM results WHERE template_id = ${t.id} AND user_id = ${uid} AND NOT flagged`;
      myBest = b?.best ?? null;
    }
    return Response.json({ ...t, participants: p?.participants ?? 0, my_best: myBest });
  } catch {
    return Response.json({ error: "Failed to load exam." }, { status: 500 });
  }
}
