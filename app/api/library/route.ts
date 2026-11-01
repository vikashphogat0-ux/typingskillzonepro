import { sql } from "@/lib/db";
import { istDate } from "@/lib/library";

/** Daily passages are visible only on their upload day; completed months are archived as one bundle. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const requestedLang = u.searchParams.get("lang");
  const lang = requestedLang === "en" || requestedLang === "hi" ? requestedLang : null;
  const q = (u.searchParams.get("q") ?? "").trim().slice(0, 60);
  const tpl = u.searchParams.get("template") ?? "";
  try {
    const db = sql();
    const one = u.searchParams.get("id");
    if (one) {
      if (!/^[0-9a-f-]{36}$/i.test(one)) return Response.json({ error: "Not found." }, { status: 404 });
      const [p] = await db`WITH ranked AS (
        SELECT p.id, p.title, p.language, p.word_count, p.body,
          row_number() OVER (
            PARTITION BY p.template_id, p.language, date_trunc('month', p.created_at AT TIME ZONE 'Asia/Kolkata')
            ORDER BY p.created_at ASC, p.id ASC
          ) AS passage_number
        FROM passages p
        WHERE NOT EXISTS (SELECT 1 FROM passage_distributions d WHERE d.passage_id = p.id AND d.status = 'archived')
      )
      SELECT id, title, language, word_count, body, passage_number FROM ranked WHERE id = ${one}`;
      return p ? Response.json(p) : Response.json({ error: "Not found." }, { status: 404 });
    }

    const today = istDate();
    const currentMonth = today.slice(0, 7);
    const requestedMonth = u.searchParams.get("month") ?? "";
    const monthRows = await db`SELECT DISTINCT to_char(p.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') AS month
      FROM passages p LEFT JOIN exam_templates et ON et.id = p.template_id
      WHERE NOT EXISTS (SELECT 1 FROM passage_distributions d WHERE d.passage_id = p.id AND d.status = 'archived')
        AND to_char(p.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') < ${currentMonth}
        AND (${tpl} = '' OR et.slug = ${tpl})
        AND (${lang}::text IS NULL OR p.language = ${lang})
      ORDER BY month DESC`;
    const months = monthRows.map((row: any) => String(row.month));
    const safeMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) && months.includes(requestedMonth)
      ? requestedMonth : (months[0] ?? "");

    const dailyItems = await db`WITH ranked AS (
        SELECT p.*, row_number() OVER (
          PARTITION BY p.template_id, p.language, date_trunc('month', p.created_at AT TIME ZONE 'Asia/Kolkata')
          ORDER BY p.created_at ASC, p.id ASC
        ) AS month_passage_number
        FROM passages p
        WHERE NOT EXISTS (SELECT 1 FROM passage_distributions d WHERE d.passage_id = p.id AND d.status = 'archived')
      )
      SELECT p.id,
        CASE WHEN p.title ~* 'passage[[:space:]]+[0-9]+'
          THEN regexp_replace(p.title, 'passage[[:space:]]+[0-9]+', 'Passage ' || lpad(p.month_passage_number::text, 2, '0'), 'i')
          ELSE p.title END AS title,
        p.language, p.word_count, p.month_passage_number AS passage_number,
        (p.created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS date, et.name AS exam
      FROM ranked p LEFT JOIN exam_templates et ON et.id = p.template_id
      WHERE to_char(p.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') = ${currentMonth}
        AND (p.created_at AT TIME ZONE 'Asia/Kolkata')::date <= ${today}::date
        AND (${lang}::text IS NULL OR p.language = ${lang})
        AND (${tpl} = '' OR et.slug = ${tpl})
      ORDER BY p.created_at ASC, p.id ASC`;

    const like = `%${q.replace(/[%_]/g, "")}%`;
    const list = await db`WITH ranked AS (
        SELECT p.*, row_number() OVER (
          PARTITION BY p.template_id, p.language, date_trunc('month', p.created_at AT TIME ZONE 'Asia/Kolkata')
          ORDER BY p.created_at ASC, p.id ASC
        ) AS month_passage_number
        FROM passages p
          WHERE NOT EXISTS (SELECT 1 FROM passage_distributions d WHERE d.passage_id = p.id AND d.status = 'archived')
      )
      SELECT p.id, p.month_passage_number AS passage_number,
        CASE WHEN p.title ~* 'passage[[:space:]]+[0-9]+'
          THEN regexp_replace(p.title, 'passage[[:space:]]+[0-9]+', 'Passage ' || lpad(p.month_passage_number::text, 2, '0'), 'i')
          ELSE p.title END AS title,
        p.language, p.word_count, left(p.body, 140) AS preview, et.name AS exam
      FROM ranked p LEFT JOIN exam_templates et ON et.id = p.template_id
      WHERE (${lang}::text IS NULL OR p.language = ${lang})
        AND (${q} = '' OR p.title ILIKE ${like} OR p.id::text ILIKE ${like}
          OR p.month_passage_number::text = ltrim(${q}, '0') OR p.body ILIKE ${like})
        AND (${tpl} = '' OR et.slug = ${tpl})
      ORDER BY p.created_at ASC, p.id ASC`;

    let monthly: any[] = [];
    if (safeMonth) {
      monthly = await db`WITH ranked AS (
          SELECT p.*, row_number() OVER (
            PARTITION BY p.template_id, p.language, date_trunc('month', p.created_at AT TIME ZONE 'Asia/Kolkata')
            ORDER BY p.created_at ASC, p.id ASC
          ) AS month_passage_number
          FROM passages p
          WHERE NOT EXISTS (SELECT 1 FROM passage_distributions d WHERE d.passage_id = p.id AND d.status = 'archived')
        )
        SELECT p.id,
          CASE WHEN p.title ~* 'passage[[:space:]]+[0-9]+'
            THEN regexp_replace(p.title, 'passage[[:space:]]+[0-9]+', 'Passage ' || lpad(p.month_passage_number::text, 2, '0'), 'i')
            ELSE p.title END AS title,
          p.month_passage_number AS passage_number, p.language, p.word_count,
          p.body, (p.created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS date, et.name AS exam
        FROM ranked p LEFT JOIN exam_templates et ON et.id = p.template_id
        WHERE to_char(p.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') = ${safeMonth}
          AND (${lang}::text IS NULL OR p.language = ${lang})
          AND (${tpl} = '' OR et.slug = ${tpl})
        ORDER BY p.created_at ASC, p.id ASC`;
    }

    return Response.json({
      today,
      daily: { [lang ?? "en"]: dailyItems[0] ?? null },
      dailyItems,
      archive: {},
      list,
      monthly,
      months,
      selectedMonth: safeMonth || null,
    });
  } catch (error) {
    console.error("GET /api/library failed:", error);
    // Keep existing simulator libraries readable if the additive passage-intelligence
    // migration has not yet been applied. The legacy query reads existing passage rows
    // only; it does not write data or bypass language/template filters.
    const db = sql();
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "") : "";
    if (code === "42P01" || code === "42703") {
      try {
        const one = u.searchParams.get("id");
        if (one) {
          if (!/^[0-9a-f-]{36}$/i.test(one)) return Response.json({ error: "Not found." }, { status: 404 });
          const [passage] = await db`SELECT p.id, p.title, p.language, p.word_count, p.body, 1 AS passage_number
            FROM passages p LEFT JOIN exam_templates et ON et.id = p.template_id
            WHERE p.id = ${one}
              AND (${lang}::text IS NULL OR p.language = ${lang})
              AND (${tpl} = '' OR et.slug = ${tpl})`;
          return passage ? Response.json(passage) : Response.json({ error: "Not found." }, { status: 404 });
        }
        const today = istDate();
        const month = today.slice(0, 7);
        const like = `%${q.replace(/[%_]/g, "")}%`;
        const base = await db`SELECT p.id, p.title, p.language, p.word_count,
            left(p.body, 140) AS preview, p.body,
            row_number() OVER (PARTITION BY p.template_id, p.language,
              date_trunc('month', p.created_at AT TIME ZONE 'Asia/Kolkata')
              ORDER BY p.created_at ASC, p.id ASC) AS passage_number,
            (p.created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS date,
            et.name AS exam, et.slug AS template_slug,
            to_char(p.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') AS month
          FROM passages p LEFT JOIN exam_templates et ON et.id = p.template_id
          WHERE (${lang}::text IS NULL OR p.language = ${lang})
            AND (${tpl} = '' OR et.slug = ${tpl})
          ORDER BY p.created_at ASC, p.id ASC`;
        const list = base.filter((p: any) => !q || String(p.title).toLowerCase().includes(q.toLowerCase())
          || String(p.id).includes(q) || String(p.body).toLowerCase().includes(q.toLowerCase()))
          .map(({ body, template_slug, month: _month, ...p }: any) => p);
        const dailyItems = base.filter((p: any) => p.month === month && p.date <= today)
          .map(({ body, template_slug, month: _month, ...p }: any) => p);
        const months = [...new Set(base.map((p: any) => p.month).filter((m: string) => m < month))].sort().reverse();
        const requestedMonth = u.searchParams.get("month") ?? "";
        const selectedMonth = /^\\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) && months.includes(requestedMonth)
          ? requestedMonth : (months[0] ?? "");
        const monthly = base.filter((p: any) => p.month === selectedMonth)
          .map(({ body, template_slug, month: _month, ...p }: any) => ({ ...p, body }));
        return Response.json({ today, daily: { [lang ?? "en"]: dailyItems[0] ?? null },
          dailyItems, archive: {}, list, monthly, months, selectedMonth: selectedMonth || null,
          compatibilityMode: true });
      } catch (fallbackError) {
        console.error("GET /api/library legacy compatibility query failed:", fallbackError);
      }
    }
    return Response.json({ error: "Passage library is temporarily unavailable. Please verify the passage-intelligence database migration and retry." }, { status: 503 });
  }
}
