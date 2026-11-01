import { sql } from "@/lib/db";
import { getUserId, requireAdmin } from "@/lib/auth";
import { analyzeEvents } from "@/lib/analytics";
import type { KeyEvent } from "@/lib/wpmCalculator";

type Attempt = { id: string; created_at: string; net_wpm: string | number; gross_wpm: string | number; accuracy: string | number; simulator: string | null; keystrokes: unknown; reference_text: string | null };

function insights(rows: Attempt[]) {
  const keys: Record<string, { attempts: number; errors: number }> = {};
  const pairs: Record<string, { attempts: number; errors: number }> = {};
  for (const row of rows) {
    if (!Array.isArray(row.keystrokes) || !row.reference_text) continue;
    try {
      const a = analyzeEvents(row.keystrokes as KeyEvent[], row.reference_text);
      for (const [key, stat] of Object.entries(a.keys)) {
        keys[key] ??= { attempts: 0, errors: 0 };
        keys[key].attempts += stat.attempts; keys[key].errors += stat.errors;
      }
      for (const combo of a.weakCombos) {
        pairs[combo.pair] ??= { attempts: 0, errors: 0 };
        pairs[combo.pair].attempts += combo.attempts; pairs[combo.pair].errors += combo.errors;
      }
    } catch { /* Ignore malformed historical event payloads; never block the report. */ }
  }
  const rank = (source: Record<string, { attempts: number; errors: number }>) =>
    Object.entries(source).filter(([, s]) => s.attempts >= 5 && s.errors > 0)
      .map(([label, s]) => ({ label, attempts: s.attempts, errors: s.errors, errorRate: Math.round(s.errors / s.attempts * 1000) / 10 }))
      .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors).slice(0, 8);
  return { weakKeys: rank(keys), weakPairs: rank(pairs) };
}

export async function GET(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to view intelligent coaching." }, { status: 401 });
  const adminId = await requireAdmin(req);
  const isAdmin = Boolean(adminId);
  const db = sql();
  if (isAdmin && new URL(req.url).searchParams.get("scope") === "platform") {
    const requestedDays = Number(new URL(req.url).searchParams.get("days") ?? 30);
    const periodDays = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const [totals] = await db`SELECT count(*)::int AS attempts, count(DISTINCT user_id)::int AS learners,
      round(avg(net_wpm)::numeric, 1) AS avg_net_wpm, round(avg(accuracy)::numeric, 1) AS avg_accuracy,
      count(*) FILTER (WHERE passed = true)::int AS passed,
      count(*) FILTER (WHERE passed = false)::int AS not_passed
      FROM results WHERE created_at >= now() - ${periodDays} * interval '1 day'`;
    const [previousTotals] = await db`SELECT count(*)::int AS attempts, count(DISTINCT user_id)::int AS learners,
      round(avg(net_wpm)::numeric, 1) AS avg_net_wpm, round(avg(accuracy)::numeric, 1) AS avg_accuracy,
      count(*) FILTER (WHERE passed = true)::int AS passed,
      count(*) FILTER (WHERE passed = false)::int AS not_passed
      FROM results
      WHERE created_at >= now() - ${periodDays * 2} * interval '1 day'
        AND created_at < now() - ${periodDays} * interval '1 day'`;
    const [interventions] = await db`
      WITH learner_activity AS (
        SELECT user_id, count(*)::int AS attempts,
          avg(net_wpm)::numeric AS avg_net_wpm,
          avg(accuracy)::numeric AS avg_accuracy,
          max(created_at) AS last_attempt
        FROM results
        WHERE created_at >= now() - ${periodDays} * interval '1 day'
        GROUP BY user_id
      )
      SELECT count(*)::int AS active_learners,
        count(*) FILTER (WHERE avg_accuracy < 90)::int AS accuracy_support,
        count(*) FILTER (WHERE avg_net_wpm < 25)::int AS speed_support,
        count(*) FILTER (WHERE attempts <= 1)::int AS low_engagement,
        count(*) FILTER (WHERE last_attempt < now() - interval '14 days')::int AS inactive_14_days
      FROM learner_activity
    `;
    const learnerQueue = await db`
      WITH learner_activity AS (
        SELECT user_id, count(*)::int AS attempts,
          round(avg(net_wpm)::numeric, 1) AS avg_net_wpm,
          round(avg(accuracy)::numeric, 1) AS avg_accuracy,
          max(created_at) AS last_attempt
        FROM results
        WHERE created_at >= now() - ${periodDays} * interval '1 day'
        GROUP BY user_id
      ),
      flagged AS (
        SELECT *,
          array_remove(ARRAY[
            CASE WHEN avg_accuracy < 90 THEN 'accuracy' END,
            CASE WHEN avg_net_wpm < 25 THEN 'speed' END,
            CASE WHEN attempts <= 1 THEN 'engagement' END,
            CASE WHEN last_attempt < now() - interval '14 days' THEN 'inactive' END
          ], NULL) AS flags
        FROM learner_activity
      )
      SELECT left(md5(user_id::text), 10) AS learner_ref,
        attempts, avg_net_wpm, avg_accuracy, last_attempt, flags,
        CASE
          WHEN 'accuracy' = ANY(flags) THEN 'Offer a short accuracy-first drill and review error patterns.'
          WHEN 'speed' = ANY(flags) THEN 'Recommend foundational rhythm drills before speed work.'
          WHEN 'inactive' = ANY(flags) THEN 'Consider a friendly re-engagement reminder.'
          ELSE 'Recommend a simple weekly practice target and check progress.'
        END AS suggested_action
      FROM flagged
      WHERE cardinality(flags) > 0
      ORDER BY cardinality(flags) DESC, last_attempt ASC
      LIMIT 100
    `;
    const simulators = await db`SELECT et.slug, et.name, count(r.id)::int AS attempts,
      round(avg(r.net_wpm)::numeric, 1) AS avg_net_wpm, round(avg(r.accuracy)::numeric, 1) AS avg_accuracy
      FROM results r JOIN exam_templates et ON et.id = r.template_id
      WHERE r.created_at >= now() - ${periodDays} * interval '1 day'
      GROUP BY et.slug, et.name ORDER BY attempts DESC LIMIT 15`;
    const samples = await db`SELECT r.id, r.created_at, r.net_wpm, r.gross_wpm, r.accuracy, et.name AS simulator, r.keystrokes, r.reference_text
      FROM results r LEFT JOIN exam_templates et ON et.id = r.template_id
      WHERE r.created_at >= now() - ${periodDays} * interval '1 day' AND r.keystrokes IS NOT NULL AND r.reference_text IS NOT NULL
      ORDER BY r.created_at DESC LIMIT 300`;
    return Response.json({ role: "admin", periodDays, totals: totals ?? {}, previousTotals: previousTotals ?? {}, interventions: interventions ?? {}, learnerQueue, simulators, patterns: insights(samples as Attempt[]), sampleAttempts: samples.length });
  }
  const rows = await db`SELECT r.id, r.created_at, r.net_wpm, r.gross_wpm, r.accuracy, et.name AS simulator, r.keystrokes, r.reference_text
    FROM results r LEFT JOIN exam_templates et ON et.id = r.template_id
    WHERE r.user_id = ${uid} AND r.created_at >= now() - interval '14 days'
    ORDER BY r.created_at DESC LIMIT 500`;
  const attempts = rows as Attempt[];
  const allNums = attempts.map(r => ({ netWpm: Number(r.net_wpm), grossWpm: Number(r.gross_wpm), accuracy: Number(r.accuracy), createdAt: r.created_at, simulator: r.simulator }));
  const nums = allNums.slice(0, 30);
  const now = Date.now();
  const recentWeek = allNums.filter(x => now - new Date(x.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);
  const previousWeek = allNums.filter(x => { const age = now - new Date(x.createdAt).getTime(); return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000; });
  const avg = (values: number[]) => values.length ? Math.round(values.reduce((a,b) => a+b, 0) / values.length * 10) / 10 : 0;
  const weeklyReport = {
    recent: { attempts: recentWeek.length, avgNetWpm: avg(recentWeek.map(x=>x.netWpm)), bestNetWpm: recentWeek.length ? Math.max(...recentWeek.map(x=>x.netWpm)) : 0, avgAccuracy: avg(recentWeek.map(x=>x.accuracy)) },
    previous: { attempts: previousWeek.length, avgNetWpm: avg(previousWeek.map(x=>x.netWpm)), avgAccuracy: avg(previousWeek.map(x=>x.accuracy)) },
    changes: { avgNetWpm: recentWeek.length && previousWeek.length ? avg(recentWeek.map(x=>x.netWpm)) - avg(previousWeek.map(x=>x.netWpm)) : null, avgAccuracy: recentWeek.length && previousWeek.length ? avg(recentWeek.map(x=>x.accuracy)) - avg(previousWeek.map(x=>x.accuracy)) : null },
    coverage: { days: 14, attemptsAnalysed: allNums.length, capped: allNums.length === 500 }
  };
  const patterns = insights(attempts);
  const recommendations: string[] = [];
  const meanAccuracy = avg(nums.map(x => x.accuracy));
  const meanSpeed = avg(nums.map(x => x.netWpm));
  if (!attempts.length) recommendations.push("Complete a practice test to unlock your personal typing diagnosis.");
  else {
    if (meanAccuracy < 95) recommendations.push("Prioritise controlled accuracy drills before trying to increase speed.");
    else recommendations.push("Your average accuracy is stable enough to work on gradual speed increases.");
    if (patterns.weakKeys[0]) recommendations.push("Focus on the key “" + patterns.weakKeys[0].label + "” — it has the highest observed error rate in your recent attempts.");
    if (patterns.weakPairs[0]) recommendations.push("Repeat short drills containing “" + patterns.weakPairs[0].label + "” to improve that letter transition.");
    if (nums.length >= 4 && nums[0].netWpm < avg(nums.slice(1).map(x => x.netWpm)) - 2) recommendations.push("Your latest speed is below your previous-session average. Use a short warm-up and prioritise rhythm.");
    if (recommendations.length === 1) recommendations.push("Keep a consistent practice schedule and review your trend after a few more attempts.");
  }
  return Response.json({ role: "student", attempts: nums, weeklyReport, summary: { tests: nums.length, avgNetWpm: meanSpeed, avgAccuracy: meanAccuracy, bestNetWpm: nums.length ? Math.max(...nums.map(x => x.netWpm)) : 0 }, patterns, recommendations });
}
