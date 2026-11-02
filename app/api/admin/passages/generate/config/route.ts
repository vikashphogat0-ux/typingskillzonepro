import { sql } from "@/lib/db";

export async function GET(req: Request) {
  const secret = process.env.PASSAGE_CRON_SECRET;
  const supplied = req.headers.get("x-passage-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!secret || !supplied || supplied !== secret) {
    return Response.json({ error: "Scheduled-job authorization required." }, { status: 403 });
  }

  try {
    const db = sql();
    const rows = await db`SELECT slug, name, language FROM exam_templates
      WHERE is_active = true AND language IN ('en', 'hi')
      ORDER BY language, name`;
    const templates = {
      en: rows.filter((row: any) => row.language === "en").map((row: any) => ({ slug: row.slug, name: row.name })),
      hi: rows.filter((row: any) => row.language === "hi").map((row: any) => ({ slug: row.slug, name: row.name })),
    };
    if (!templates.en.length || !templates.hi.length) {
      return Response.json({ error: "At least one active English and one active Hindi simulator are required.", templates }, { status: 422 });
    }
    return Response.json({ ok: true, templates });
  } catch (error) {
    console.error("[passage-generator-config] failed", error);
    return Response.json({ error: "Could not load active simulator destinations." }, { status: 500 });
  }
}
