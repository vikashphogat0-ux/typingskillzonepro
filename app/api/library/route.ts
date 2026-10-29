import { sql } from "@/lib/db";
import { dailyPick, istDate, recentDates } from "@/lib/library";

/** Public passage library: daily picks, monthly browsing, and a searchable passage collection. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const requestedLang = u.searchParams.get("lang");
  const lang = requestedLang === "en" || requestedLang === "hi" ? requestedLang : null;
  const q = (u.searchParams.get("q") ?? "").trim().slice(0, 60), tpl = u.searchParams.get("template") ?? "";
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
      const pool = await db`WITH ranked AS (SELECT id, title, language, word_count, row_number() OVER (ORDER BY created_at ASC, id ASC) AS passage_number FROM passages) SELECT id, title, word_count, passage_number FROM ranked WHERE language = ${l} ORDER BY id`;
      const pick = dailyPick(pool as any[], today, l);
      if (pick) { const [full] = await db`WITH ranked AS (SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS passage_number FROM passages) SELECT p.id, p.title, p.word_count, p.body, ranked.passage_number FROM passages p JOIN ranked ON ranked.id = p.id WHERE p.id = ${pick.id}`; daily[l] = { date: today, ...full }; }
      archive[l] = dates.map((d) => ({ date: d, ...(dailyPick(pool as any[], d, l) as any) })).filter((x) => x.id);
    }
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const list = await db`WITH ranked AS (SELECT p.*, row_number() OVER (ORDER BY p.created_at ASC, p.id ASC) AS passage_number FROM passages p)
      SELECT p.id, p.passage_number, p.title, p.language, p.word_count, left(p.body, 140) AS preview, et.name AS exam
      FROM ranked p LEFT JOIN exam_templates et ON et.id = p.template_id
      WHERE (${lang}::text IS NULL OR p.language = ${lang}) AND (${q} = '' OR p.title ILIKE ${like} OR p.id::text ILIKE ${like} OR p.passage_number::text = ltrim(${q}, '0') OR p.body ILIKE ${like}) AND (${tpl} = '' OR et.slug = ${tpl})
      ORDER BY p.created_at ASC, p.id ASC`;
    const monthly = await db`WITH ranked AS (SELECT p.*, row_number() OVER (ORDER BY p.created_at ASC, p.id ASC) AS passage_number FROM passages p)
      SELECT p.id, p.passage_number, p.title, p.language, p.word_count, left(p.body, 180) AS preview, p.created_at::date::text AS date, et.name AS exam
      FROM ranked p LEFT JOIN exam_templates et ON et.id = p.template_id
      WHERE p.created_at >= (${safeMonth} || '-01')::date
        AND p.created_at < ((${safeMonth} || '-01')::date + interval '1 month')
        AND (${lang}::text IS NULL OR p.language = ${lang})
      ORDER BY p.created_at ASC, p.id ASC`;
    const monthRows = await db`SELECT DISTINCT to_char(created_at, 'YYYY-MM') AS month FROM passages ORDER BY month DESC`;
    const months = monthRows.map((row: any) => String(row.month));
    if (!months.includes(safeMonth)) months.unshift(safeMonth);
    return Response.json({ today, daily, archive, list, monthly, months });
  } catch (error) {
    console.error("GET /api/library failed:", error);
    return Response.json(
      { error: "Passage library is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
}
