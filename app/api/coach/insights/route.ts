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
    const [totals] = await db`SELECT count(*)::int AS attempts, count(DISTINCT user_id)::int AS learners,
      round(avg(net_wpm)::numeric, 1) AS avg_net_wpm, round(avg(accuracy)::numeric, 1) AS avg_accuracy,
      count(*) FILTER (WHERE passed = true)::int AS passed,
      count(*) FILTER (WHERE passed = false)::int AS not_passed
      FROM results WHERE created_at >= now() - interval '30 days'`;
    const simulators = await db`SELECT et.slug, et.name, count(r.id)::int AS attempts,
      round(avg(r.net_wpm)::numeric, 1) AS avg_net_wpm, round(avg(r.accuracy)::numeric, 1) AS avg_accuracy
      FROM results r JOIN exam_templates et ON et.id = r.template_id
      WHERE r.created_at >= now() - interval '30 days'
      GROUP BY et.slug, et.name ORDER BY attempts DESC LIMIT 15`;
    const samples = await db`SELECT r.id, r.created_at, r.net_wpm, r.gross_wpm, r.accuracy, et.name AS simulator, r.keystrokes, r.reference_text
      FROM results r LEFT JOIN exam_templates et ON et.id = r.template_id
      WHERE r.created_at >= now() - interval '30 days' AND r.keystrokes IS NOT NULL AND r.reference_text IS NOT NULL
      ORDER BY r.created_at DESC LIMIT 300`;
    return Response.json({ role: "admin", periodDays: 30, totals: totals ?? {}, simulators, patterns: insights(samples as Attempt[]), sampleAttempts: samples.length });
  }
  const rows = await db`SELECT r.id, r.created_at, r.net_wpm, r.gross_wpm, r.accuracy, et.name AS simulator, r.keystrokes, r.reference_text
    FROM results r LEFT JOIN exam_templates et ON et.id = r.template_id
    WHERE r.user_id = ${uid} ORDER BY r.created_at DESC LIMIT 30`;
  const attempts = rows as Attempt[];
  const nums = attempts.map(r => ({ netWpm: Number(r.net_wpm), grossWpm: Number(r.gross_wpm), accuracy: Number(r.accuracy), createdAt: r.created_at, simulator: r.simulator }));
  const avg = (values: number[]) => values.length ? Math.round(values.reduce((a,b) => a+b, 0) / values.length * 10) / 10 : 0;
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
  return Response.json({ role: "student", attempts: nums, summary: { tests: nums.length, avgNetWpm: meanSpeed, avgAccuracy: meanAccuracy, bestNetWpm: nums.length ? Math.max(...nums.map(x => x.netWpm)) : 0 }, patterns, recommendations });
}
