import { sql } from "@/lib/db";
import { dailyPick, istDate, recentDates } from "@/lib/library";
import { SAMPLE_PASSAGES } from "@/lib/presets";

/** Public passage library: today's passage per language, a 14-day archive, and a searchable list. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const lang = u.searchParams.get("lang"), q = (u.searchParams.get("q") ?? "").trim().slice(0, 60), tpl = u.searchParams.get("template") ?? "";
  try {
    const db = sql();
    const one = u.searchParams.get("id");
    if (one) {
      if (!/^[0-9a-f-]{36}$/i.test(one)) return Response.json({ error: "Not found." }, { status: 404 });
      const [p] = await db`SELECT id, title, language, word_count, body FROM passages WHERE id = ${one}`;
      return p ? Response.json(p) : Response.json({ error: "Not found." }, { status: 404 });
    }
    const today = istDate(), dates = recentDates(14);
    const daily: Record<string, any> = {}, archive: Record<string, any[]> = {};
    for (const l of ["en", "hi"]) {
      const pool = await db`SELECT id, title, word_count FROM passages WHERE language = ${l} ORDER BY id`;
      const pick = dailyPick(pool as any[], today, l);
      if (pick) { const [full] = await db`SELECT id, title, word_count, body FROM passages WHERE id = ${pick.id}`; daily[l] = { date: today, ...full }; }
      archive[l] = dates.map((d) => ({ date: d, ...(dailyPick(pool as any[], d, l) as any) })).filter((x) => x.id);
    }
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const list = await db`SELECT p.id, p.title, p.language, p.word_count, left(p.body, 140) AS preview, et.name AS exam
      FROM passages p LEFT JOIN exam_templates et ON et.id = p.template_id
      WHERE (${lang}::text IS NULL OR p.language = ${lang}) AND (${q} = '' OR p.title ILIKE ${like}) AND (${tpl} = '' OR et.slug = ${tpl})
      ORDER BY p.created_at DESC`;
    return Response.json({ today, daily, archive, list });
  } catch (error) {
    if (!process.env.DATABASE_URL) {
      const today = istDate();
      const samples = (["en", "hi"] as const).flatMap((language) => SAMPLE_PASSAGES[language].map((body, index) => ({
        id: `local-${language}-${index}`, title: language === "hi" ? `स्थानीय अभ्यास अनुच्छेद ${index + 1}` : `Local practice passage ${index + 1}`,
        language, word_count: body.trim().split(/\\s+/u).filter(Boolean).length, body, preview: body.slice(0, 140), exam: null
      })));
      const id = u.searchParams.get("id");
      if (id?.startsWith("local-")) {
        const p = samples.find((x) => x.id === id);
        return p ? Response.json(p) : Response.json({ error: "Not found." }, { status: 404 });
      }
      const qLower = q.toLocaleLowerCase();
      const filtered = samples.filter((p) => (!lang || p.language === lang) && (!qLower || p.title.toLocaleLowerCase().includes(qLower) || p.body.toLocaleLowerCase().includes(qLower)));
      const daily = Object.fromEntries((["en", "hi"] as const).map((l) => [l, { ...samples.find((p) => p.language === l)!, date: today }]));
      return Response.json({ today, daily, archive: { en: [], hi: [] }, list: filtered, localFallback: true, notice: "Local sample passages only. Set DATABASE_URL to load the complete database passage library." });
    }
    console.error("GET /api/library failed:", error);
    return Response.json({ error: "Passage library is temporarily unavailable. Check the database connection and passage table." }, { status: 503 });
  }
}
