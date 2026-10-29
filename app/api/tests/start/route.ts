import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentAccess } from "@/lib/subscription";
import { buildReference, minCharsFor } from "@/lib/library";
import { SAMPLE_PASSAGES } from "@/lib/presets";

/** Starts a simulator attempt. The server picks the text and keeps it, so the browser cannot choose its own reference. */
export async function POST(req: Request) {
  let stage = "checking sign-in";
  try {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to use the exam simulators." }, { status: 401 });
  stage = "reading request";
  const b = await req.json().catch(() => null);
  if (!b?.slug) return Response.json({ error: "Choose a simulator." }, { status: 400 });
  stage = "checking subscription and daily test allowance";
  const access = await getStudentAccess(uid);
  if (access.testsLeft !== null && access.testsLeft <= 0) return Response.json({ error: "You have used your free tests for today.", upgrade: true }, { status: 402 });
  stage = "loading exam configuration";
  const db = sql();
  // Select only columns guaranteed by db/schema.sql. Optional presentation columns are not part of every deployed schema.
  const [t] = await db`SELECT id, slug, name, language, duration_sec, display_mode, backspace, scoring FROM exam_templates WHERE slug = ${String(b.slug)} AND is_active`;
  if (!t) return Response.json({ error: "Simulator not found." }, { status: 404 });
  stage = "loading passage";

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
  if (requestedCustom) {
    // A custom passage must not depend on the passage-library query.
    bodies = [requestedCustom];
  } else if (b.passageId) {
    const [selected] = await db`SELECT body FROM passages WHERE id = ${String(b.passageId)} AND language = ${t.language}`;
    if (!selected) return Response.json({ error: "That passage is unavailable for this simulator language." }, { status: 404 });
    bodies = [selected.body as string];
  } else {
    // Passage content is shared across compatible simulators. Only the selected template controls presentation and typing rules.
    const rows = await db`SELECT body FROM passages WHERE language = ${t.language} ORDER BY random() LIMIT 30`;
    bodies = rows.length ? rows.map((r: any) => r.body as string) : SAMPLE_PASSAGES[t.language as "en" | "hi"];
  }
  stage = "preparing reference passage";
  const reference = requestedCustom ? requestedCustom : buildReference(bodies, minCharsFor(t.duration_sec));
  const backspace = t.slug.startsWith("bsf-") ? "disabled" : t.slug.startsWith("dp-hcm-") ? "full" : t.backspace;

  stage = "saving test session";
  const [row] = await db`INSERT INTO tests (user_id, template_id, language, display_mode, backspace, duration_sec, reference_text, assignment_id)
    VALUES (${uid}, ${t.id}, ${t.language}, ${t.display_mode}, ${backspace}, ${t.duration_sec}, ${reference}, ${assignmentId}) RETURNING id`;
  return Response.json({ testId: row.id, reference, lang: t.language, durationSec: t.duration_sec, mode: t.display_mode, backspace, profile: t.scoring, name: t.name, slug: t.slug, fontSizePt: 12, passageLayout: "continuous", enterKeyPolicy: "newline", tabKeyPolicy: "blocked" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[simulator-start] request failed", { stage, detail });
    const message = stage === "saving test session"
      ? "The exam and passage loaded, but the database could not save the test session. Check the live tests-table schema and migration status."
      : stage === "checking subscription and daily test allowance"
        ? "Your account access could not be checked. Check the live subscription and institution tables."
        : stage === "loading exam configuration"
          ? "The exam configuration could not be loaded from the live database."
          : stage === "loading passage"
            ? "The passage could not be loaded from the live database."
            : "The test could not be prepared because of a server configuration error.";
    return Response.json({ error: message, stage, code: "SIMULATOR_START_FAILED" }, { status: 500 });
  }
}
