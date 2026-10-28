import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentAccess } from "@/lib/subscription";
import { SAMPLE_PASSAGES } from "@/lib/presets";

/** Public: one random passage. ?lang=en|hi&template=slug (template optional, falls back to any passage of that language). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const lang = u.searchParams.get("lang") === "hi" ? "hi" : "en";
  const slug = u.searchParams.get("template") ?? "";
  const passageId = u.searchParams.get("id") ?? "";
  try {
    const uid = await getUserId(req);
    if (uid) { const a = await getStudentAccess(uid); if (a.testsLeft !== null && a.testsLeft <= 0) return Response.json({ error: "Daily free limit reached. Upgrade to Pro to save more tests.", upgrade: true }, { status: 402 }); }
    const db = sql();
    if (passageId) {
      const [selected] = await db`SELECT id, title, body FROM passages WHERE id = ${passageId} AND language = ${lang}`;
      return selected ? Response.json(selected) : Response.json({ error: "That passage is not available in the selected language." }, { status: 404 });
    }
    let rows = slug ? await db`SELECT id, title, body FROM passages WHERE language = ${lang} AND template_id = (SELECT id FROM exam_templates WHERE slug = ${slug}) ORDER BY random() LIMIT 1` : [];
    if (!rows.length) rows = await db`SELECT id, title, body FROM passages WHERE language = ${lang} ORDER BY random() LIMIT 1`;
    return rows.length ? Response.json(rows[0]) : Response.json({ error: "No passages yet." }, { status: 404 });
  } catch (error) {
    console.error("GET /api/passages failed; serving a built-in sample passage as a temporary fallback:", error);
    {
      const samples = SAMPLE_PASSAGES[lang];
      const localMatch = /^local-(en|hi)-(\d+)$/.exec(passageId);
      if (passageId && (!localMatch || localMatch[1] !== lang)) return Response.json({ error: "That passage is not available in the selected language." }, { status: 404 });
      const index = localMatch ? Number(localMatch[2]) : Math.floor(Math.random() * samples.length);
      const body = samples[index];
      if (!body) return Response.json({ error: "Passage not found." }, { status: 404 });
      return Response.json({ id: `local-${lang}-${index}`, title: "Local sample passage", body, language: lang, localFallback: true });
    }
    return Response.json({ error: "Passages are unavailable." }, { status: 503 });
  }
}
