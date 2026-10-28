import { sql } from "@/lib/db";
import { dailyPick, istDate, recentDates } from "@/lib/library";
import { SAMPLE_PASSAGES } from "@/lib/presets";

/** Public passage library: daily picks, monthly browsing, and a searchable passage collection. */
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
    const requestedMonth = u.searchParams.get("month") ?? today.slice(0, 7);
    const safeMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today.slice(0, 7);
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
    const monthly = await db`SELECT p.id, p.title, p.language, p.word_count, left(p.body, 180) AS preview, p.created_at::date::text AS date, et.name AS exam
      FROM passages p LEFT JOIN exam_templates et ON et.id = p.template_id
      WHERE p.created_at >= (${safeMonth} || '-01')::date
        AND p.created_at < ((${safeMonth} || '-01')::date + interval '1 month')
        AND (${lang}::text IS NULL OR p.language = ${lang})
      ORDER BY p.created_at DESC, p.title ASC`;
    const monthRows = await db`SELECT DISTINCT to_char(created_at, 'YYYY-MM') AS month FROM passages ORDER BY month DESC`;
    const months = monthRows.map((row: { month: string }) => row.month);
    if (!months.includes(safeMonth)) months.unshift(safeMonth);
    return Response.json({ today, daily, archive, list, monthly, months });
  } catch (error) {
    console.error("GET /api/library failed; serving built-in sample passages as a temporary fallback:", error);
    {
      const today = istDate();
      const samples = (["en", "hi"] as const).flatMap((language) => SAMPLE_PASSAGES[language].map((body, index) => ({
        id: `local-${language}-${index}`, title: language === "hi" ? `स्थानीय अभ्यास अनुच्छेद ${index + 1}` : `Local practice passage ${index + 1}`,
        language, word_count: body.trim().split(/\s+/u).filter(Boolean).length, body, preview: body.slice(0, 140), exam: null
      })));
      const id = u.searchParams.get("id");
      if (id?.startsWith("local-")) {
        const p = samples.find((x) => x.id === id);
        return p ? Response.json(p) : Response.json({ error: "Not found." }, { status: 404 });
      }
      const qLower = q.toLocaleLowerCase();
      const filtered = samples.filter((p) => (!lang || p.language === lang) && (!qLower || p.title.toLocaleLowerCase().includes(qLower) || p.body.toLocaleLowerCase().includes(qLower)));
      const daily = Object.fromEntries((["en", "hi"] as const).map((l) => [l, { ...samples.find((p) => p.language === l)!, date: today }]));
      return Response.json({ today, daily, archive: { en: [], hi: [] }, list: filtered, localFallback: true, notice: "Database-backed passages are temporarily unavailable. Built-in sample passages are shown while the database connection or schema is repaired." });
    }
    console.error("GET /api/library failed:", error);
    return Response.json({ error: "Passage library is temporarily unavailable. Check the database connection and passage table." }, { status: 503 });
  }
}
