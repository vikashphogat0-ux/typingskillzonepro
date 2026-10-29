import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentAccess } from "@/lib/subscription";
import { LIMITS } from "@/lib/pricing";
import { buildReference, minCharsFor } from "@/lib/library";

/** Starts a simulator attempt. The server picks the text and keeps it, so the browser cannot choose its own reference. */
export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to use the exam simulators." }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.slug) return Response.json({ error: "Choose a simulator." }, { status: 400 });
  const access = await getStudentAccess(uid);
  if (access.testsLeft !== null && access.testsLeft <= 0) return Response.json({ error: "You have used your free tests for today.", upgrade: true }, { status: 402 });
  const db = sql();
  const [t] = await db`SELECT id, slug, name, language, duration_sec, display_mode, backspace, scoring, font_size_pt, passage_layout, enter_key_policy, tab_key_policy FROM exam_templates WHERE slug = ${String(b.slug)} AND is_active`;
  if (!t) return Response.json({ error: "Simulator not found." }, { status: 404 });

  const requestedCustom = typeof b.customPassage === "string" ? b.customPassage.trim() : "";
  if (requestedCustom && (requestedCustom.split(/\s+/u).filter(Boolean).length < 10 || Array.from(requestedCustom).length > 50000)) {
    return Response.json({ error: "Custom passages must contain at least 10 words and no more than 50,000 characters." }, { status: 400 });
  }

  let assignmentId: string | null = null;
  if (b.assignmentId) {
    const [a] = await db`SELECT a.id FROM assignments a JOIN institution_members im ON im.institution_id = a.institution_id AND im.user_id = ${uid}
      WHERE a.id = ${String(b.assignmentId)} AND a.template_id = ${t.id}
        AND (a.batch_id IS NULL OR a.batch_id IN (SELECT batch_id FROM batch_members WHERE user_id = ${uid}))`;
    assignmentId = a?.id ?? null;
  }

  let bodies: string[];
  if (b.passageId) {
    const [selected] = await db`SELECT body FROM passages WHERE id = ${String(b.passageId)} AND language = ${t.language}`;
    if (!selected) return Response.json({ error: "That passage is unavailable for this simulator language." }, { status: 404 });
    bodies = [selected.body as string];
  } else {
    // Passage content is shared across compatible simulators. Only the selected template controls presentation and typing rules.
    const rows = await db`SELECT body FROM passages WHERE language = ${t.language} ORDER BY random() LIMIT 30`;
    bodies = rows.map((r: any) => r.body as string);
    if (!bodies.length && !requestedCustom) {
      return Response.json({ error: "No passages are available for this exam yet. Please try again later." }, { status: 503 });
    }
  }
  const reference = requestedCustom ? requestedCustom : buildReference(bodies, minCharsFor(t.duration_sec));
  const backspace = t.slug.startsWith("bsf-") ? "disabled" : t.slug.startsWith("dp-hcm-") ? "full" : t.backspace;

  // Serialize starts per user, then re-count and insert inside the same transaction.
  // This prevents concurrent requests from bypassing the free daily allowance.
  const tx = await db.transaction([
    db`SELECT pg_advisory_xact_lock(hashtextextended(${uid}::text, 0))`,
    db`
      WITH usage AS MATERIALIZED (
        SELECT count(*)::int AS tests_today
        FROM tests
        WHERE user_id = ${uid}
          AND started_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
      )
      INSERT INTO tests (user_id, template_id, language, display_mode, backspace, duration_sec, reference_text, assignment_id)
      SELECT ${uid}, ${t.id}, ${t.language}, ${t.display_mode}, ${backspace}, ${t.duration_sec}, ${reference}, ${assignmentId}
      FROM usage
      WHERE ${access.testsLeft === null}::boolean OR usage.tests_today < ${LIMITS.free.testsPerDay}
      RETURNING id
    `,
  ]);
  const [row] = tx[1] as Array<{ id: string }>;
  if (!row) return Response.json({ error: "You have used your free tests for today.", upgrade: true }, { status: 402 });
  return Response.json({ testId: row.id, reference, lang: t.language, durationSec: t.duration_sec, mode: t.display_mode, backspace, profile: t.scoring, name: t.name, slug: t.slug, fontSizePt: t.font_size_pt ?? 12, passageLayout: t.passage_layout ?? "continuous", enterKeyPolicy: t.enter_key_policy ?? "newline", tabKeyPolicy: t.tab_key_policy ?? "blocked" });
}
