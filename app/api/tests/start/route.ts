import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentAccess } from "@/lib/subscription";
import { buildReference, minCharsFor } from "@/lib/library";
import { SAMPLE_PASSAGES } from "@/lib/presets";

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
    bodies = rows.length ? rows.map((r: any) => r.body as string) : SAMPLE_PASSAGES[t.language as "en" | "hi"];
  }
  const reference = buildReference(bodies, minCharsFor(t.duration_sec));

  const [row] = await db`INSERT INTO tests (user_id, template_id, language, display_mode, backspace, duration_sec, reference_text, assignment_id)
    VALUES (${uid}, ${t.id}, ${t.language}, ${t.display_mode}, ${t.backspace}, ${t.duration_sec}, ${reference}, ${assignmentId}) RETURNING id`;
  return Response.json({ testId: row.id, reference, lang: t.language, durationSec: t.duration_sec, mode: t.display_mode, backspace: t.backspace, profile: t.scoring, name: t.name, slug: t.slug, fontSizePt: t.font_size_pt ?? 12, passageLayout: t.passage_layout ?? "continuous", enterKeyPolicy: t.enter_key_policy ?? "newline", tabKeyPolicy: t.tab_key_policy ?? "blocked" });
}
