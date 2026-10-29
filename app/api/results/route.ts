import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentAccess } from "@/lib/subscription";
import { LIMITS } from "@/lib/pricing";
import { calculateScore, PROFILES, type KeyEvent } from "@/lib/wpmCalculator";
import { validateAttempt } from "@/lib/antiCheat";

export async function GET(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to see your history." }, { status: 401 });
  const { limits } = await getStudentAccess(uid);
  const rows = await sql()`SELECT r.id, r.created_at, r.net_wpm, r.gross_wpm, r.accuracy, et.name AS simulator
    FROM results r LEFT JOIN exam_templates et ON et.id = r.template_id
    WHERE r.user_id = ${uid} ORDER BY r.created_at DESC LIMIT ${limits.historyRows}`;
  return Response.json(rows);
}

export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to save results." }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b) return Response.json({ error: "Invalid result." }, { status: 400 });
  return b.testId ? submitSimulator(uid, b) : submitPractice(uid, b);
}

/** Simulator attempt: the server's stored text is the reference, and the key log must reproduce the typed text. */
async function submitSimulator(uid: string, b: any) {
  const db = sql();
  const [t] = await db`SELECT t.id, t.template_id, t.assignment_id, t.duration_sec, t.reference_text, t.submitted, t.display_mode, t.backspace, et.scoring
    FROM tests t LEFT JOIN exam_templates et ON et.id = t.template_id WHERE t.id = ${String(b.testId)} AND t.user_id = ${uid}`;
  if (!t || !t.reference_text) return Response.json({ error: "Test not found." }, { status: 404 });
  if (t.submitted) return Response.json({ error: "This test was already submitted." }, { status: 409 });
  const typed = String(b.typed ?? "").slice(0, 30000);
  const events: KeyEvent[] = Array.isArray(b.events) ? b.events.slice(0, 40001) : [];
  const check = validateAttempt({ typed, events, elapsedSec: Number(b.elapsedSec) || 0, durationSec: t.duration_sec });
  if (check.tampered) return Response.json({ error: "This result could not be verified." }, { status: 400 });
  const profile = t.scoring ?? PROFILES.practice;
  const s = calculateScore({ reference: t.reference_text, typed, elapsedSec: check.elapsedSec, durationSec: t.duration_sec, profile, keyEvents: events });
  // Claim the attempt and save its result atomically. If result insertion fails,
  // PostgreSQL rolls back the claim, so a legitimate retry is not locked out.
  const [r] = await db`
    WITH claimed AS (
      UPDATE tests SET submitted = true
      WHERE id = ${t.id} AND user_id = ${uid} AND NOT submitted
      RETURNING id
    ), saved AS (
      INSERT INTO results (test_id, user_id, template_id, assignment_id, gross_wpm, net_wpm, accuracy, full_errors, half_errors, fixed_errors, ignored_errors, penalty_wpm, passed, breakdown, keystrokes, typed_text, reference_text, elapsed_sec, flagged)
      SELECT claimed.id, ${uid}, ${t.template_id}, ${t.assignment_id}, ${s.grossWpm}, ${s.netWpm}, ${s.accuracy}, ${s.fullErrors}, ${s.halfErrors}, ${s.fixedErrors}, ${s.ignoredErrors}, ${s.penaltyWpm}, ${s.passed},
        ${JSON.stringify({ ...s, wordOps: undefined, profile })}::jsonb, ${JSON.stringify(events)}::jsonb, ${typed}, ${t.reference_text}, ${check.elapsedSec}, ${check.flagged}
      FROM claimed
      RETURNING id
    ) SELECT id FROM saved
  `;
  if (!r) return Response.json({ error: "This test was already submitted." }, { status: 409 });
  return Response.json({ ok: true, id: r.id, score: s, flagged: check.flagged });
}

/** Free practice with custom rules: saved to your history only, never ranked. */
async function submitPractice(uid: string, b: any) {
  const access = await getStudentAccess(uid);
  if (access.testsLeft !== null && access.testsLeft <= 0) return Response.json({ error: "Daily free limit reached. Upgrade to Pro to save more tests.", upgrade: true }, { status: 402 });
  const profile = PROFILES[b.profileId];
  if (!profile || typeof b.reference !== "string" || typeof b.typed !== "string") return Response.json({ error: "Invalid result." }, { status: 400 });
  const events: KeyEvent[] = Array.isArray(b.events) ? b.events.slice(0, 40000) : [];
  const duration = Math.min(Math.max(Number(b.durationSec) || 0, 30), 3600);
  const reference = b.reference.slice(0, 30000), typed = b.typed.slice(0, 30000);
  const check = validateAttempt({ typed, events, elapsedSec: Number(b.elapsedSec) || 0, durationSec: duration });
  if (check.tampered) return Response.json({ error: "This result could not be verified." }, { status: 400 });
  const s = calculateScore({ reference, typed, elapsedSec: check.elapsedSec, durationSec: duration, profile, keyEvents: events });
  const db = sql();
  const enforceDailyLimit = access.testsLeft !== null;
  // Enforce the free quota at write time and save test + result atomically.
  // This closes the race where parallel requests could exceed the daily cap,
  // and prevents orphan test rows if result persistence fails.
  const [saved] = await db`
    WITH eligibility AS MATERIALIZED (
      SELECT
        ${!enforceDailyLimit}::boolean AS unlimited,
        (SELECT count(*)::int FROM tests
          WHERE user_id = ${uid}
            AND started_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
        ) AS tests_today
    ), created_test AS (
      INSERT INTO tests (user_id, language, display_mode, backspace, duration_sec, reference_text, submitted)
      SELECT ${uid}, ${/[\\u0900-\\u097F]/.test(reference) ? "hi" : "en"}, ${String(b.mode)}, ${String(b.backspace)}, ${duration}, ${reference}, true
      FROM eligibility
      WHERE unlimited OR tests_today < ${LIMITS.free.testsPerDay}
      RETURNING id
    ), saved_result AS (
      INSERT INTO results (test_id, user_id, gross_wpm, net_wpm, accuracy, full_errors, half_errors, fixed_errors, ignored_errors, penalty_wpm, passed, breakdown, keystrokes, typed_text, reference_text, elapsed_sec, flagged)
      SELECT created_test.id, ${uid}, ${s.grossWpm}, ${s.netWpm}, ${s.accuracy}, ${s.fullErrors}, ${s.halfErrors}, ${s.fixedErrors}, ${s.ignoredErrors}, ${s.penaltyWpm}, ${s.passed},
        ${JSON.stringify({ ...s, wordOps: undefined, profile })}::jsonb, ${JSON.stringify(events)}::jsonb, ${typed}, ${reference}, ${check.elapsedSec}, ${check.flagged}
      FROM created_test
      RETURNING id
    ) SELECT id FROM saved_result
  `;
  if (!saved) return Response.json({ error: "Daily free limit reached. Upgrade to Pro to save more tests.", upgrade: true }, { status: 402 });
  return Response.json({ ok: true, id: saved.id, score: s });
}
