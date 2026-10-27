import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  try {
    const db = sql();
    const [t] = await db`SELECT slug, name, language, duration_sec, display_mode, backspace, scoring, description FROM exam_templates WHERE slug = ${slug} AND is_active`;
    if (!t) return Response.json({ error: "Simulator not found." }, { status: 404 });

    // Get participants count
    const [p] = await db`SELECT count(DISTINCT user_id)::int AS participants FROM results WHERE template_id = ${t.id} AND NOT flagged`;

    // Get user's best score if signed in
    const uid = await getUserId(req).catch(() => null);
    let myBest = null;
    if (uid) {
      const [best] = await db`SELECT max(net_wpm) AS best FROM results WHERE template_id = ${t.id} AND user_id = ${uid} AND NOT flagged`;
      myBest = best?.best;
    }

    return Response.json({
      slug: t.slug,
      name: t.name,
      language: t.language,
      duration_sec: t.duration_sec,
      display_mode: t.display_mode,
      backspace: t.backspace,
      scoring: t.scoring,
      description: t.description,
      participants: p?.participants ?? 0,
      my_best: myBest
    });
  } catch (err) {
    return Response.json({ error: "Failed to load simulator." }, { status: 500 });
  }
}