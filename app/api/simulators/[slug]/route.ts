import { sql } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  try {
    const db = sql();
    const [t] = await db`SELECT slug, name, language, duration_sec, display_mode, backspace, scoring, description
      FROM exam_templates WHERE slug = ${slug} AND is_active = true`;
    if (!t) return Response.json({ error: "Simulator not found." }, { status: 404 });

    return Response.json({
      slug: t.slug,
      name: t.name,
      language: t.language,
      duration_sec: t.duration_sec,
      display_mode: t.display_mode,
      backspace: t.backspace,
      scoring: t.scoring,
      description: t.description,
      participants: 0,
      my_best: null
    });
  } catch (error) {
    console.error("GET /api/simulators/[slug] failed:", error);
    return Response.json({ error: "Simulator details are temporarily unavailable. Check the database connection and exam seed data." }, { status: 503 });
  }
}