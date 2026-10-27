import { analyzeKeyLog, norm, type KeyEvent, type ScoreResult } from "./wpmCalculator.ts";

export interface Bucket { startSec: number; wpm: number; accuracy: number; typed: number; wrong: number }
export interface KeyStat { attempts: number; errors: number }
export interface Combo { pair: string; attempts: number; errors: number; rate: number }

/** Replay the key log once and collect per-key and per-bucket numbers. */
export function analyzeEvents(events: KeyEvent[], reference: string, bucketSec = 30) {
  const ref = Array.from(norm(reference));
  const stack: boolean[] = [];
  const keys: Record<string, KeyStat> = {};
  const pairs: Record<string, KeyStat> = {};
  const buckets: Record<number, { typed: number; wrong: number }> = {};
  for (const e of events) {
    const b = Math.floor(e.t / 1000 / bucketSec);
    buckets[b] ??= { typed: 0, wrong: 0 };
    if (e.type === "ins" && e.ch !== undefined) {
      const pos = stack.length, want = ref[pos], bad = e.ch !== want;
      stack.push(bad);
      buckets[b].typed++;
      if (bad) buckets[b].wrong++;
      if (want !== undefined && want.trim() !== "") {
        const k = want.toLowerCase();
        keys[k] ??= { attempts: 0, errors: 0 };
        keys[k].attempts++;
        if (bad) keys[k].errors++;
        if (pos > 0 && ref[pos - 1].trim() !== "") {
          const pr = (ref[pos - 1] + want).toLowerCase();
          pairs[pr] ??= { attempts: 0, errors: 0 };
          pairs[pr].attempts++;
          if (bad) pairs[pr].errors++;
        }
      }
    } else if (e.type === "del") {
      for (let i = 0; i < (e.n ?? 1) && stack.length; i++) stack.pop();
    }
  }
  const last = Math.max(0, ...Object.keys(buckets).map(Number));
  const timeline: Bucket[] = [];
  for (let i = 0; i <= last; i++) {
    const v = buckets[i] ?? { typed: 0, wrong: 0 };
    timeline.push({
      startSec: i * bucketSec,
      typed: v.typed,
      wrong: v.wrong,
      wpm: Math.round(((v.typed - v.wrong) / 5 / (bucketSec / 60)) * 10) / 10,
      accuracy: v.typed ? Math.round(((v.typed - v.wrong) / v.typed) * 1000) / 10 : 100,
    });
  }
  const weakCombos: Combo[] = Object.entries(pairs)
    .filter(([, s]) => s.attempts >= 2 && s.errors > 0)
    .map(([pair, s]) => ({ pair, ...s, rate: s.errors / s.attempts }))
    .sort((a, b) => b.rate - a.rate || b.errors - a.errors)
    .slice(0, 6);
  return { keys, timeline, weakCombos };
}

/** Buckets whose accuracy is clearly below the test average. */
export function accuracyDrops(timeline: Bucket[], overall: number, gap = 8) {
  return timeline.filter((b) => b.typed >= 10 && b.accuracy < overall - gap).map((b) => b.startSec);
}

/** Rule-based coaching text. Works offline; /api/feedback can write a richer version. */
export function coachNotes(s: ScoreResult, combos: Combo[], drops: number[]): string[] {
  const out: string[] = [];
  if (s.accuracy < 95) out.push(`Accuracy is ${s.accuracy}%. Slow down about 10% until it stays above 95%; every mistake also costs speed through the penalty.`);
  else out.push(`Accuracy is strong at ${s.accuracy}%. You can push speed a little now.`);
  if (s.fixedErrors > s.ignoredErrors * 2 && s.fixedErrors > 5) out.push(`You corrected ${s.fixedErrors} mistakes. Fixing is fine in exams that allow backspace, but each fix costs time. Aim to type cleanly the first time.`);
  if (s.ignoredErrors > 0) out.push(`${s.ignoredErrors} wrong characters were left in the final text. Re-read the last line before time ends if your exam allows it.`);
  if (s.halfErrors > s.fullErrors) out.push("Most of your mistakes are half mistakes (capital letters or punctuation). Watch Shift and comma/full stop.");
  if (combos.length) out.push(`Practise these letter pairs: ${combos.slice(0, 3).map((c) => `"${c.pair}"`).join(", ")}. They caused the most errors.`);
  if (drops.length) out.push(`Accuracy fell around ${drops.map((d) => `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`).join(", ")}. That is usually fatigue or rushing. Take a breath at those points.`);
  if (s.passed === false) out.push("This run is below the qualifying mark of the selected profile. Work on accuracy first.");
  return out;
}

export { analyzeKeyLog };
