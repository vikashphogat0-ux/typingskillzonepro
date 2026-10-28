import { sql } from "@/lib/db";
import { dailyPick, fileName, istDate, passageFile } from "@/lib/library";
import { SAMPLE_PASSAGES } from "@/lib/presets";

const text = (body: string, name: string) => new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "public, max-age=300" } });

/** ?id=uuid | ?date=YYYY-MM-DD&lang=en|hi | ?pack=today (both languages in one file) */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!process.env.DATABASE_URL) {
    const id = u.searchParams.get("id");
    if (id?.startsWith("local-")) {
      const match = /^local-(en|hi)-(\d+)$/.exec(id);
      if (!match) return Response.json({ error: "Not found." }, { status: 404 });
      const language = match[1], index = Number(match[2]);
      const body = SAMPLE_PASSAGES[language as "en" | "hi"][index];
      if (!body) return Response.json({ error: "Not found." }, { status: 404 });
      const title = language === "hi" ? `स्थानीय अभ्यास अनुच्छेद ${index + 1}` : `Local practice passage ${index + 1}`;
      return text(passageFile({ title, language, body }), fileName(title, language));
    }
    if (u.searchParams.get("pack") === "today") {
      const parts = (["en", "hi"] as const).map((language) => ({
        title: language === "hi" ? "दैनिक स्थानीय अभ्यास" : "Daily local practice",
        language, body: SAMPLE_PASSAGES[language][0]
      }));
      return text(parts.map((p) => passageFile(p)).join("\\r\\n------------------------------\\r\\n\\r\\n"), "local-daily-pack.txt");
    }
    const language = u.searchParams.get("lang") === "hi" ? "hi" : "en";
    const index = Number(u.searchParams.get("date") ? 0 : NaN);
    if (Number.isFinite(index)) {
      const body = SAMPLE_PASSAGES[language][index];
      const title = language === "hi" ? "दैनिक स्थानीय अभ्यास" : "Daily local practice";
      return text(passageFile({ title, language, body }, u.searchParams.get("date") ?? undefined), fileName(title, language, u.searchParams.get("date") ?? undefined));
    }
    return Response.json({ error: "DATABASE_URL is not set. Configure Neon to download the complete passage library." }, { status: 503 });
  }
  const db = sql();
  const daily = async (date: string, lang: string) => {
    const pool = await db`SELECT id FROM passages WHERE language = ${lang} ORDER BY id`;
    const pick = dailyPick(pool as any[], date, lang);
    if (!pick) return null;
    const [p] = await db`SELECT title, language, body FROM passages WHERE id = ${pick.id}`;
    return p as { title: string; language: string; body: string };
  };
  const id = u.searchParams.get("id");
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
    const [p] = await db`SELECT title, language, body FROM passages WHERE id = ${id}`;
    return p ? text(passageFile(p as any), fileName(p.title, p.language)) : Response.json({ error: "Not found." }, { status: 404 });
  }
  const date = u.searchParams.get("date") ?? istDate();
  const today = istDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return Response.json({ error: "Choose today or an earlier date." }, { status: 400 });
  if (u.searchParams.get("pack") === "today") {
    const parts = (await Promise.all(["en", "hi"].map((l) => daily(today, l)))).filter(Boolean) as { title: string; language: string; body: string }[];
    if (!parts.length) return Response.json({ error: "No passages yet." }, { status: 404 });
    return text("\uFEFF" + parts.map((p) => passageFile(p).replace("\uFEFF", "")).join("\r\n------------------------------\r\n\r\n"), `${today}-daily-pack.txt`);
  }
  const lang = u.searchParams.get("lang") === "hi" ? "hi" : "en";
  const p = await daily(date, lang);
  return p ? text(passageFile(p, date), fileName(p.title, lang, date)) : Response.json({ error: "No passage for that day." }, { status: 404 });
}
