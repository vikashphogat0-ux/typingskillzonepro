import type { WordOp } from "./wpmCalculator.ts";

export interface Seg { t: "same" | "missing" | "extra"; s: string }

/** Character-level comparison of one typed word against the reference word (longest common subsequence). */
export function charDiff(typed: string, ref: string): Seg[] {
  const a = Array.from(ref), b = Array.from(typed);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: Seg[] = [];
  const push = (t: Seg["t"], c: string) => { const l = out[out.length - 1]; if (l && l.t === t) l.s += c; else out.push({ t, s: c }); };
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { push("same", a[i]); i++; j++; }
    else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) { push("extra", b[j]); j++; }
    else { push("missing", a[i]); i++; }
  }
  return out;
}

export interface Token { kind: WordOp["op"]; typed?: string; ref?: string; segs?: Seg[] }

export const annotate = (ops: WordOp[]): Token[] =>
  ops.map((o) => ({
    kind: o.op,
    typed: "typed" in o ? o.typed : undefined,
    ref: "ref" in o ? o.ref : undefined,
    segs: (o.op === "full" || o.op === "half") ? charDiff(o.typed, o.ref) : undefined,
  }));

export interface Patterns {
  wrongWords: { ref: string; typed: string; count: number }[];
  confusions: { from: string; to: string; count: number }[]; // expected letter -> typed letter
  missingLetters: { ch: string; count: number }[];
  extraLetters: { ch: string; count: number }[];
  omitted: number; extra: number;
}

const top = <T extends { count: number }>(m: Map<string, T>, n = 8) => [...m.values()].sort((a, b) => b.count - a.count).slice(0, n);

/** What kinds of mistakes the typist makes, across one or many attempts. */
export function mistakePatterns(ops: WordOp[]): Patterns {
  const words = new Map<string, { ref: string; typed: string; count: number }>();
  const conf = new Map<string, { from: string; to: string; count: number }>();
  const miss = new Map<string, { ch: string; count: number }>();
  const extra = new Map<string, { ch: string; count: number }>();
  let omitted = 0, extras = 0;
  const bump = <T extends { count: number }>(m: Map<string, T>, k: string, mk: () => T) => { const e = m.get(k) ?? mk(); e.count++; m.set(k, e); };
  for (const o of ops) {
    if (o.op === "omit") omitted++;
    else if (o.op === "extra") extras++;
    else if (o.op === "full") {
      bump(words, `${o.ref}|${o.typed}`, () => ({ ref: o.ref, typed: o.typed, count: 0 }));
      const segs = charDiff(o.typed, o.ref);
      const m = segs.filter((s) => s.t === "missing").map((s) => Array.from(s.s)).flat();
      const x = segs.filter((s) => s.t === "extra").map((s) => Array.from(s.s)).flat();
      // a missing letter paired with an extra letter at the same spot is a substitution
      if (m.length === x.length && m.length <= 3) m.forEach((c, i) => bump(conf, `${c}>${x[i]}`, () => ({ from: c, to: x[i], count: 0 })));
      else { m.forEach((c) => bump(miss, c, () => ({ ch: c, count: 0 }))); x.forEach((c) => bump(extra, c, () => ({ ch: c, count: 0 }))); }
    }
  }
  return { wrongWords: top(words), confusions: top(conf), missingLetters: top(miss), extraLetters: top(extra), omitted, extra: extras };
}
