/**
 * wpmCalculator.ts: scoring engine for Indian typing exams.
 * Pure functions, no DOM or React, so it runs in the browser, on the server and in tests.
 *
 * IMPORTANT: preset numbers below are starting points. Confirm qualifying speed,
 * duration and error rules against the current official notification of each exam
 * and edit the profile (or store it in exam_templates.scoring) before relying on it.
 */

export type Lang = "en" | "hi";

export interface ScoringProfile {
  id: string;
  label: string;
  /** "words": count characters in the final text. "keystrokes": count key depressions (typing + backspace). */
  unit: "words" | "keystrokes";
  charsPerWord: number; // standard: 5 characters (including space) = 1 word
  fullErrorWeight: number; // value of a full mistake, normally 1
  halfErrorWeight: number; // value of a half mistake, normally 0.5
  halfRules: { caseOnly: boolean; punctuationOnly: boolean };
  /** "penalty": net = gross - errorUnits/minutes. "accuracy": net = gross * accuracy%. */
  netMethod: "penalty" | "accuracy";
  qualifyingWpm?: number;
  maxErrorPercent?: number;
}

export interface KeyEvent {
  t: number; // ms since first key
  type: "ins" | "del";
  ch?: string; // inserted character (ins)
  n?: number; // number of characters removed (del)
}

export type WordOp =
  | { op: "ok"; typed: string; ref: string }
  | { op: "half"; typed: string; ref: string }
  | { op: "full"; typed: string; ref: string }
  | { op: "omit"; ref: string }
  | { op: "extra"; typed: string };

export interface ScoreInput {
  reference: string;
  typed: string;
  elapsedSec: number;
  durationSec: number;
  profile: ScoringProfile;
  keyEvents?: KeyEvent[];
}

export interface ScoreResult {
  minutes: number;
  typedChars: number;
  typedWords: number;
  referenceWordsReached: number;
  keystrokes: number;
  grossWpm: number;
  netWpm: number;
  penaltyWpm: number;
  accuracy: number; // 0..100
  errorPercent: number; // 0..100
  fullErrors: number;
  halfErrors: number;
  errorUnits: number;
  fixedErrors: number; // wrong characters the typist corrected with backspace
  ignoredErrors: number; // wrong characters left in the final text
  backspaceCount: number;
  passed: boolean | null; // null when the profile has no pass rule
  wordOps: WordOp[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const norm = (s: string) => s.normalize("NFC");
const words = (s: string) => norm(s).trim().split(/\s+/).filter(Boolean);
const stripPunct = (w: string) => w.replace(/[\p{P}\p{S}]/gu, "");

export function classifyWord(typed: string, ref: string, p: ScoringProfile): "ok" | "half" | "full" {
  if (typed === ref) return "ok";
  if (p.halfRules.caseOnly && typed.toLowerCase() === ref.toLowerCase()) return "half";
  if (p.halfRules.punctuationOnly && stripPunct(typed) === stripPunct(ref) && stripPunct(ref) !== "") return "half";
  return "full";
}

/**
 * Align typed words to the reference with a weighted edit distance.
 * Reference words the typist never reached are free, so a short attempt
 * is not punished for the part of the passage it did not get to.
 */
export function alignWords(typed: string[], ref: string[], p: ScoringProfile) {
  const n = typed.length, m = ref.length;
  const W = { full: p.fullErrorWeight, half: p.halfErrorWeight };
  const cost = (a: string, b: string) => {
    const k = classifyWord(a, b, p);
    return k === "ok" ? 0 : k === "half" ? W.half : W.full;
  };
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i * W.full; // extra words
  for (let j = 1; j <= m; j++) dp[0][j] = j * W.full; // omitted words
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + cost(typed[i - 1], ref[j - 1]),
        dp[i - 1][j] + W.full,
        dp[i][j - 1] + W.full
      );
  // choose the reference prefix length that fits the typed text best
  let bestJ = 0;
  for (let j = 0; j <= m; j++) {
    const better = dp[n][j] < dp[n][bestJ] - 1e-9;
    const tie = Math.abs(dp[n][j] - dp[n][bestJ]) < 1e-9 && Math.abs(j - n) < Math.abs(bestJ - n);
    if (better || tie) bestJ = j;
  }
  const ops: WordOp[] = [];
  let i = n, j = bestJ;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + cost(typed[i - 1], ref[j - 1]))) < 1e-9) {
      const k = classifyWord(typed[i - 1], ref[j - 1], p);
      ops.push({ op: k, typed: typed[i - 1], ref: ref[j - 1] });
      i--; j--;
    } else if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + W.full)) < 1e-9) {
      ops.push({ op: "extra", typed: typed[i - 1] });
      i--;
    } else {
      ops.push({ op: "omit", ref: ref[j - 1] });
      j--;
    }
  }
  return { ops: ops.reverse(), reached: bestJ };
}

/** Replays the key log to separate fixed (corrected) errors from ignored (left in text) ones. */
export function analyzeKeyLog(events: KeyEvent[], reference: string) {
  const ref = Array.from(norm(reference));
  const stack: boolean[] = []; // true = this typed character is wrong
  let fixed = 0, backspaces = 0, inserted = 0, deleted = 0;
  for (const e of events) {
    if (e.type === "ins" && e.ch !== undefined) {
      stack.push(e.ch !== ref[stack.length]);
      inserted++;
    } else if (e.type === "del") {
      const n = e.n ?? 1;
      backspaces++;
      for (let k = 0; k < n && stack.length; k++) {
        if (stack.pop()) fixed++;
        deleted++;
      }
    }
  }
  return { fixed, ignored: stack.filter(Boolean).length, backspaces, keystrokes: inserted + deleted };
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const { profile: p } = input;
  const typedText = norm(input.typed);
  const refText = norm(input.reference);
  const elapsed = Math.min(Math.max(input.elapsedSec, 0), input.durationSec);
  const minutes = Math.max(elapsed / 60, 1 / 60);

  const typedWords = words(typedText);
  const refWords = words(refText);
  const { ops, reached } = alignWords(typedWords, refWords, p);

  const full = ops.filter((o) => o.op === "full" || o.op === "omit" || o.op === "extra").length;
  const half = ops.filter((o) => o.op === "half").length;
  const errorUnits = full * p.fullErrorWeight + half * p.halfErrorWeight;

  const typedChars = Array.from(typedText).length;
  const log = input.keyEvents ? analyzeKeyLog(input.keyEvents, refText) : null;
  const keystrokes = log ? log.keystrokes : typedChars;
  const basis = p.unit === "keystrokes" ? keystrokes : typedChars;

  const grossWpm = basis / p.charsPerWord / minutes;
  const errorPercent = typedWords.length ? Math.min(100, (errorUnits / typedWords.length) * 100) : 0;
  const accuracy = 100 - errorPercent;
  const penaltyWpm = p.netMethod === "penalty" ? Math.min(grossWpm, errorUnits / minutes) : 0;
  const netWpm = p.netMethod === "penalty" ? Math.max(0, grossWpm - penaltyWpm) : grossWpm * (accuracy / 100);

  let passed: boolean | null = null;
  if (p.qualifyingWpm !== undefined || p.maxErrorPercent !== undefined) {
    passed =
      (p.qualifyingWpm === undefined || netWpm >= p.qualifyingWpm) &&
      (p.maxErrorPercent === undefined || errorPercent <= p.maxErrorPercent);
  }

  return {
    minutes: round2(minutes),
    typedChars,
    typedWords: typedWords.length,
    referenceWordsReached: reached,
    keystrokes,
    grossWpm: round2(grossWpm),
    netWpm: round2(netWpm),
    penaltyWpm: round2(penaltyWpm),
    accuracy: round2(accuracy),
    errorPercent: round2(errorPercent),
    fullErrors: full,
    halfErrors: half,
    errorUnits: round2(errorUnits),
    fixedErrors: log ? log.fixed : 0,
    ignoredErrors: log ? log.ignored : 0,
    backspaceCount: log ? log.backspaces : 0,
    passed,
    wordOps: ops,
  };
}

/* ---------- Preset profiles (verify against official notifications) ---------- */
const base: Omit<ScoringProfile, "id" | "label"> = {
  unit: "words",
  charsPerWord: 5,
  fullErrorWeight: 1,
  halfErrorWeight: 0.5,
  halfRules: { caseOnly: true, punctuationOnly: true },
  netMethod: "penalty",
};

export const PROFILES: Record<string, ScoringProfile> = {
  "ssc-chsl-en": { ...base, id: "ssc-chsl-en", label: "SSC CHSL (English)", qualifyingWpm: 35 },
  "ssc-chsl-hi": { ...base, id: "ssc-chsl-hi", label: "SSC CHSL (Hindi)", qualifyingWpm: 30 },
  "ssc-cgl-dest": { ...base, id: "ssc-cgl-dest", label: "SSC CGL (key depressions)", unit: "keystrokes", qualifyingWpm: 26.7 },
  "rrb-ntpc-en": { ...base, id: "rrb-ntpc-en", label: "RRB NTPC (English)", qualifyingWpm: 30 },
  "rrb-ntpc-hi": { ...base, id: "rrb-ntpc-hi", label: "RRB NTPC (Hindi)", qualifyingWpm: 25 },
  "high-court": { ...base, id: "high-court", label: "High Court clerical (editable)" },
  practice: { ...base, id: "practice", label: "Free practice" },
};
