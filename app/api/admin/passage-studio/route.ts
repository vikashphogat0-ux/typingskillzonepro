import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { countWords, validatePassage } from "@/lib/adminValidation";

const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  try {
    const url = new URL(req.url);
    const language = url.searchParams.get("lang");
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
    const status = url.searchParams.get("status") ?? "active";
    const db = sql();
    const rows = await db`
      WITH numbered AS (
        SELECT s.*,
          row_number() OVER (
            PARTITION BY s.language, date_trunc('month', s.created_at AT TIME ZONE 'Asia/Kolkata')
            ORDER BY s.created_at, s.id
          ) AS visible_number
        FROM passage_sources s
        WHERE (${status} = 'all' OR (${status} = 'archived' AND s.archived_at IS NOT NULL)
          OR (${status} = 'active' AND s.archived_at IS NULL))
          AND (${language}::text IS NULL OR s.language = ${language})
          AND (${q} = '' OR s.title ILIKE ${'%' + q.replace(/[%_]/g, '') + '%'}
            OR s.body ILIKE ${'%' + q.replace(/[%_]/g, '') + '%'} OR s.id::text ILIKE ${'%' + q + '%'})
      )
      SELECT n.id, n.title, n.language, n.body, n.word_count, n.source_type, n.source_filename,
        n.version, n.visible_number, n.created_at, n.updated_at, n.archived_at,
        COALESCE(jsonb_agg(
          jsonb_build_object('slug', et.slug, 'name', et.name, 'status', d.status, 'passageId', d.passage_id)
          ORDER BY et.name
        ) FILTER (WHERE d.id IS NOT NULL), '[]'::jsonb) AS distributions,
        count(d.id)::int AS distribution_count,
        count(d.id) FILTER (WHERE d.status = 'published')::int AS published_count
      FROM numbered n
      LEFT JOIN passage_distributions d ON d.source_id = n.id
      LEFT JOIN exam_templates et ON et.id = d.template_id
      GROUP BY n.id
      ORDER BY n.created_at DESC, n.id
      LIMIT 1000
    `;
    return Response.json(rows);
  } catch (error) {
    console.error("GET /api/admin/passage-studio failed:", error);
    return Response.json({ error: "Passage Studio could not load its master repository. Confirm that the additive passage intelligence migration (20261101_passage_intelligence_system.sql) has been applied to the configured Neon database. Existing data is not modified by this check." }, { status: 503 });
  }
}

/** Version content without mutating passages already referenced by historical tests. */
export async function PATCH(req: Request) {
  const uid = await requireAdmin(req);
  if (!uid) return deny();
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "A valid source ID is required." }, { status: 400 });
  const checked = validatePassage({
    title: String(body?.title ?? ""),
    language: body?.language,
    body: String(body?.body ?? ""),
  });
  if (!checked.ok) return Response.json({ error: checked.errors.join(" ") }, { status: 422 });

  try {
    const db = sql();
    const [languageConflict] = await db`
      SELECT count(*)::int AS count
      FROM passage_distributions d
      JOIN exam_templates et ON et.id = d.template_id
      WHERE d.source_id = ${id}::uuid AND d.status = 'published'
        AND et.language <> ${checked.clean.language}
    `;
    if (Number(languageConflict?.count ?? 0) > 0) {
      return Response.json({ error: "A distributed passage cannot change language. Create a new source in the required language instead." }, { status: 422 });
    }
    const result = await db`
      WITH current_source AS (
        SELECT id, version FROM passage_sources
        WHERE id = ${id}::uuid AND archived_at IS NULL
      ),
      version_snapshot AS (
        INSERT INTO passage_versions (source_id, version, title, language, body, word_count, changed_by)
        SELECT s.id, s.version, p.title, p.language, p.body, p.word_count, ${uid}
        FROM current_source s
        JOIN passage_sources p ON p.id = s.id
        RETURNING id
      ),
      updated_source AS (
        UPDATE passage_sources p SET
          title = ${checked.clean.title},
          language = ${checked.clean.language},
          body = ${checked.clean.body},
          word_count = ${countWords(checked.clean.body)},
          version = p.version + 1,
          updated_at = now()
        FROM current_source c
        WHERE p.id = c.id
        RETURNING p.id, p.title, p.language, p.body, p.word_count, p.version
      ),
      replacement_passages AS (
        INSERT INTO passages (template_id, language, title, body, word_count, created_by, format_metadata)
        SELECT d.template_id, u.language,
          (et.name || ' — ' || u.title)::text,
          u.body, u.word_count, ${uid},
          jsonb_build_object('sourceId', u.id::text, 'sourceVersion', u.version, 'simulatorSlug', et.slug)
        FROM updated_source u
        JOIN passage_distributions d ON d.source_id = u.id AND d.status = 'published'
        JOIN exam_templates et ON et.id = d.template_id
        RETURNING id, template_id, format_metadata
      ),
      repointed AS (
        UPDATE passage_distributions d SET passage_id = p.id, published_at = now(), last_error = NULL
        FROM replacement_passages p
        WHERE d.source_id = (p.format_metadata->>'sourceId')::uuid
          AND d.template_id = p.template_id
        RETURNING d.id
      )
      SELECT (SELECT version FROM updated_source LIMIT 1) AS version,
        (SELECT count(*)::int FROM replacement_passages) AS republished,
        (SELECT count(*)::int FROM repointed) AS distributions_updated
    `;
    if (!result.length || result[0].version == null) return Response.json({ error: "Source passage not found or archived." }, { status: 404 });
    return Response.json({ ok: true, version: Number(result[0].version), republished: Number(result[0].republished), distributionsUpdated: Number(result[0].distributions_updated) });
  } catch (error) {
    console.error("PATCH /api/admin/passage-studio failed:", error);
    return Response.json({ error: "Passage version could not be published. Existing versions and test history were not intentionally modified." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const uid = await requireAdmin(req);
  if (!uid) return deny();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "A valid source ID is required." }, { status: 400 });
  try {
    const db = sql();
    const result = await db`
      WITH archived_source AS (
        UPDATE passage_sources SET archived_at = now(), updated_at = now()
        WHERE id = ${id}::uuid AND archived_at IS NULL
        RETURNING id
      ),
      archived_distributions AS (
        UPDATE passage_distributions SET status = 'archived', last_error = 'Archived by administrator'
        WHERE source_id IN (SELECT id FROM archived_source)
        RETURNING id
      )
      SELECT (SELECT count(*)::int FROM archived_source) AS archived,
        (SELECT count(*)::int FROM archived_distributions) AS distributions
    `;
    if (!Number(result[0]?.archived)) return Response.json({ error: "Active source passage not found." }, { status: 404 });
    return Response.json({ ok: true, archived: true, distributions: Number(result[0].distributions) });
  } catch (error) {
    console.error("DELETE /api/admin/passage-studio failed:", error);
    return Response.json({ error: "Passage could not be archived." }, { status: 500 });
  }
}
