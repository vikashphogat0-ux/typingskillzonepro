/**
 * Exam-aware typing scoring engine.
 *
 * Important: profiles are configuration, not a claim that an exam's official
 * rules have been verified. Confirm each profile against the current official
 * notification before presenting its result as an official qualifying score.
 */
export type Lang = "en" | "hi";
export type ErrorPercentBasis = "typedWords" | "referenceWordsReached" | "referenceWords";

export interface ScoringProfile {
  id: string;
  label: string;
  language?: Lang;
  /** "words" counts Unicode code points in final text; "keystrokes" counts inserted + deleted characters when a key log is supplied. */
  unit: "words" | "keystrokes";
  charsPerWord: number;
  fullErrorWeight: number;
  halfErrorWeight: number;
  halfRules: { caseOnly: boolean; punctuationOnly: boolean };
  netMethod: "penalty" | "accuracy" | "per-error" | "rrb";
  /** RRB CBTST ignores this percentage of weighted errors before speed calculation. */
  errorAllowancePercent?: number;
  /** Which speed is used for qualification; defaults to net speed for compatibility. */
  qualificationBasis?: "gross" | "net";
  /** Passage completion target, where a notification explicitly requires it. */
  minWords?: number;
  /** Approximate target key depressions for data-entry practice; not automatically a pass rule. */
  targetKeystrokes?: number;
  /** How error percentage is normalized. Default preserves legacy behavior. */
  errorPercentBasis?: ErrorPercentBasis;
  /** Optional exam duration metadata. The attempt duration is still passed to calculateScore. */
  durationSec?: number;
  qualifyingWpm?: number;
  maxErrorPercent?: number;
}

export interface KeyEvent {
  t: number;
  type: "ins" | "del";
  ch?: string;
  n?: number;
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
  accuracy: number;
  errorPercent: number;
  fullErrors: number;
  halfErrors: number;
  errorUnits: number;
  fixedErrors: number;
  ignoredErrors: number;
  backspaceCount: number;
  passed: boolean | null;
  /** Official-style mark band for profiles with a configured marks table. */
  marks: number | null;
  wordOps: WordOp[];
}
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const norm = (s: string) => s.normalize("NFC");
const words = (s: string) => norm(s).trim().split(/\s+/u).filter(Boolean);
const chars = (s: string) => Array.from(norm(s));
const stripPunct = (w: string) => w.replace(/[\p{P}\p{S}]/gu, "");

function assertValidProfile(p: ScoringProfile) {
  if (!p || typeof p.id !== "string" || !p.id.trim()) throw new TypeError("Scoring profile must have an id.");
  if (!Number.isFinite(p.charsPerWord) || p.charsPerWord <= 0) throw new RangeError("charsPerWord must be a positive finite number.");
  if (!Number.isFinite(p.fullErrorWeight) || p.fullErrorWeight < 0) throw new RangeError("fullErrorWeight must be a finite non-negative number.");
  if (!Number.isFinite(p.halfErrorWeight) || p.halfErrorWeight < 0) throw new RangeError("halfErrorWeight must be a finite non-negative number.");
  if (p.halfErrorWeight > p.fullErrorWeight) throw new RangeError("halfErrorWeight cannot exceed fullErrorWeight.");
  if (p.qualifyingWpm !== undefined && (!Number.isFinite(p.qualifyingWpm) || p.qualifyingWpm < 0)) throw new RangeError("qualifyingWpm must be a finite non-negative number.");
  if (p.maxErrorPercent !== undefined && (!Number.isFinite(p.maxErrorPercent) || p.maxErrorPercent < 0 || p.maxErrorPercent > 100)) throw new RangeError("maxErrorPercent must be between 0 and 100.");
  if (p.durationSec !== undefined && (!Number.isFinite(p.durationSec) || p.durationSec <= 0)) throw new RangeError("Profile durationSec must be a positive finite number.");
  if (p.errorAllowancePercent !== undefined && (!Number.isFinite(p.errorAllowancePercent) || p.errorAllowancePercent < 0 || p.errorAllowancePercent > 100)) throw new RangeError("errorAllowancePercent must be between 0 and 100.");
}
export function classifyWord(typed: string, ref: string, p: ScoringProfile): "ok" | "half" | "full" {
  if (typed === ref) return "ok";
  if (p.halfRules.caseOnly && typed.toLocaleLowerCase() === ref.toLocaleLowerCase()) return "half";
  if (p.halfRules.punctuationOnly && stripPunct(typed) === stripPunct(ref) && stripPunct(ref) !== "") return "half";
  return "full";
}

/**
 * Weighted word alignment. The dynamic program selects the lowest-cost alignment
 * against a prefix of the reference, so unreached trailing words are not errors.
 * Internal omissions and extra words remain errors.
 */
export function alignWords(typed: string[], ref: string[], p: ScoringProfile) {
  assertValidProfile(p);
  const n = typed.length, m = ref.length;
  const full = p.fullErrorWeight, half = p.halfErrorWeight;
  const cost = (a: string, b: string) => {
    const kind = classifyWord(a, b, p);
    return kind === "ok" ? 0 : kind === "half" ? half : full;
  };
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i * full;
  for (let j = 1; j <= m; j++) dp[0][j] = j * full;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + cost(typed[i - 1], ref[j - 1]),
        dp[i - 1][j] + full,
        dp[i][j - 1] + full,
      );
    }
  }
  let bestJ = 0;
  for (let j = 1; j <= m; j++) {
    const candidate = dp[n][j], current = dp[n][bestJ];
    if (candidate < current - 1e-9 ||
      (Math.abs(candidate - current) < 1e-9 && Math.abs(j - n) < Math.abs(bestJ - n))) bestJ = j;
  }
  const ops: WordOp[] = [];
  let i = n, j = bestJ;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + cost(typed[i - 1], ref[j - 1]))) < 1e-9) {
      const kind = classifyWord(typed[i - 1], ref[j - 1], p);
      ops.push({ op: kind, typed: typed[i - 1], ref: ref[j - 1] });
      i--; j--;
    } else if (i > 0 && (j === 0 || Math.abs(dp[i][j] - (dp[i - 1][j] + full)) < 1e-9)) {
      ops.push({ op: "extra", typed: typed[i - 1] });
      i--;
    } else if (j > 0) {
      ops.push({ op: "omit", ref: ref[j - 1] });
      j--;
    } else {
      break;
    }
  }
  return { ops: ops.reverse(), reached: bestJ };
}

/**
 * Replays a sequential insertion/deletion log. This event format has no cursor
 * position, so it cannot reconstruct arbitrary mid-string cursor edits. For a
 * reliable result, emit events in text order and provide the final typed text
 * separately to calculateScore.
 */
export function analyzeKeyLog(events: KeyEvent[], reference: string) {
  const ref = chars(reference);
  const stack: boolean[] = [];
  let fixed = 0, backspaces = 0, inserted = 0, deleted = 0;
  let previousTime = -Infinity;
  for (const e of events) {
    if (!Number.isFinite(e.t) || e.t < 0 || e.t < previousTime) throw new RangeError("Key events must have finite, non-decreasing timestamps.");
    previousTime = e.t;
    if (e.type === "ins") {
      if (typeof e.ch !== "string" || chars(e.ch).length !== 1) throw new TypeError("Insertion events must contain exactly one Unicode character.");
      stack.push(e.ch !== ref[stack.length]);
      inserted++;
    } else if (e.type === "del") {
      const count = e.n ?? 1;
      if (!Number.isInteger(count) || count < 1) throw new RangeError("Deletion event length must be a positive integer.");
      backspaces++;
      for (let k = 0; k < count && stack.length; k++) {
        if (stack.pop()) fixed++;
        deleted++;
      }
    } else {
      throw new TypeError("Unsupported key event type.");
    }
  }
  return { fixed, ignored: stack.filter(Boolean).length, backspaces, keystrokes: inserted + deleted };
}

/** DP HCM marks table supplied for this simulator. Below the qualifying threshold is disqualified (0 marks). */
export function dpHcmMarks(language: Lang, actualWpm: number): number {
  if (!Number.isFinite(actualWpm)) return 0;
  // The published table uses whole-WPM bands; floor decimals before band lookup.
  const speed = Math.floor(actualWpm);
  const qualifying = language === "en" ? 30 : 25;
  if (speed < qualifying) return 0;
  if (language === "en") {
    if (speed > 50) return 25;
    if (speed >= 46) return 21;
    if (speed >= 41) return 18;
    if (speed >= 36) return 15;
    if (speed >= 31) return 12;
    return 10;
  }
  if (speed > 45) return 25;
  if (speed >= 41) return 21;
  if (speed >= 36) return 18;
  if (speed >= 31) return 15;
  if (speed >= 26) return 12;
  return 10;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const { profile: p } = input;
  assertValidProfile(p);
  if (typeof input.reference !== "string" || typeof input.typed !== "string") throw new TypeError("reference and typed must be strings.");
  if (!Number.isFinite(input.durationSec) || input.durationSec <= 0) throw new RangeError("durationSec must be a positive finite number.");
  if (!Number.isFinite(input.elapsedSec) || input.elapsedSec < 0) throw new RangeError("elapsedSec must be a finite non-negative number.");
  const typedText = norm(input.typed);
  const refText = norm(input.reference);
  const elapsed = Math.min(input.elapsedSec, input.durationSec);
  // Avoid division by zero for a result captured at the instant the test starts.
  const minutes = Math.max(elapsed / 60, 1 / 60);
  const typedWords = words(typedText), refWords = words(refText);
  const { ops, reached } = alignWords(typedWords, refWords, p);
  const fullErrors = ops.filter(o => o.op === "full" || o.op === "omit" || o.op === "extra").length;
  const halfErrors = ops.filter(o => o.op === "half").length;
  const errorUnits = fullErrors * p.fullErrorWeight + halfErrors * p.halfErrorWeight;
  const evaluatedErrorUnits = p.netMethod === "rrb"
    ? Math.max(0, errorUnits - typedWords.length * ((p.errorAllowancePercent ?? 5) / 100))
    : errorUnits;
  const typedChars = chars(typedText).length;
  const log = input.keyEvents ? analyzeKeyLog(input.keyEvents, refText) : null;
  const keystrokes = log ? log.keystrokes : typedChars;
  const basis = p.unit === "keystrokes" ? keystrokes : typedChars;
  const grossWpm = p.netMethod === "rrb" ? typedWords.length / minutes : basis / p.charsPerWord / minutes;
  const denominator = p.errorPercentBasis === "referenceWords"
    ? refWords.length
    : p.errorPercentBasis === "referenceWordsReached"
      ? reached
      : typedWords.length;
  const errorPercent = denominator ? Math.min(100, (errorUnits / denominator) * 100) : 0;
  const accuracy = Math.max(0, 100 - errorPercent);
  // "per-error" is used by DP HCM: deduct one full WPM per full word error,
  // independent of elapsed minutes. Half-errors are disabled in that profile.
  const penaltyWpm = p.netMethod === "per-error"
    ? Math.min(grossWpm, errorUnits)
    : p.netMethod === "rrb"
      ? Math.min(grossWpm, (evaluatedErrorUnits * 10) / minutes)
      : p.netMethod === "penalty" ? Math.min(grossWpm, errorUnits / minutes) : 0;
  const netWpm = p.netMethod === "rrb"
    ? Math.max(0, (typedWords.length - evaluatedErrorUnits * 10) / minutes)
    : p.netMethod === "per-error" || p.netMethod === "penalty"
      ? Math.max(0, grossWpm - penaltyWpm)
      : grossWpm * accuracy / 100;
  const isDpHcm = p.id === "delhi-police-hcm-en" || p.id === "delhi-police-hcm-hi";
  const marks = isDpHcm ? dpHcmMarks(p.id.endsWith("-hi") ? "hi" : "en", netWpm) : null;
  const hasPassRule = p.qualifyingWpm !== undefined || p.maxErrorPercent !== undefined;
  const qualificationWpm = p.qualificationBasis === "gross" ? grossWpm : netWpm;
  const passed = hasPassRule
    ? (p.qualifyingWpm === undefined || qualificationWpm >= p.qualifyingWpm) &&
      (p.maxErrorPercent === undefined || errorPercent <= p.maxErrorPercent) &&
      (p.minWords === undefined || typedWords.length >= p.minWords)
    : null;
  return {
    minutes: round2(minutes), typedChars, typedWords: typedWords.length, referenceWordsReached: reached,
    keystrokes, grossWpm: round2(grossWpm), netWpm: round2(netWpm), penaltyWpm: round2(penaltyWpm),
    accuracy: round2(accuracy), errorPercent: round2(errorPercent), fullErrors, halfErrors,
    errorUnits: round2(errorUnits), fixedErrors: log?.fixed ?? 0, ignoredErrors: log?.ignored ?? 0,
    backspaceCount: log?.backspaces ?? 0, passed, marks, wordOps: ops,
  };
}

const base: Omit<ScoringProfile, "id" | "label"> = {
  unit: "words", charsPerWord: 5, fullErrorWeight: 1, halfErrorWeight: 0.5,
  halfRules: { caseOnly: true, punctuationOnly: true }, netMethod: "penalty",
  errorPercentBasis: "typedWords",
};

/**
 * Profile values below preserve the project's existing targets for compatibility.
 * They are not a substitute for checking the current official exam notification.
 * Keep these rules configurable in admin/database configuration as the product grows.
 */
export const PROFILES: Record<string, ScoringProfile> = {
  // Existing targets retained for backward compatibility. Verify official criteria
  // before enabling pass/fail decisions in production.
  "ssc-chsl-en": { ...base, id: "ssc-chsl-en", label: "SSC CHSL LDC/JSA (English)", language: "en", durationSec: 600, qualifyingWpm: 35, qualificationBasis: "gross" },
  "ssc-chsl-hi": { ...base, id: "ssc-chsl-hi", label: "SSC CHSL LDC/JSA (Hindi)", language: "hi", durationSec: 600, qualifyingWpm: 30, qualificationBasis: "gross" },
  "ssc-cgl-dest": { ...base, id: "ssc-cgl-dest", label: "SSC CGL DEST (15-minute key-depression practice)", unit: "keystrokes", language: "en", durationSec: 900, targetKeystrokes: 2000 },
  "rrb-ntpc-en": { ...base, id: "rrb-ntpc-en", label: "RRB NTPC CBTST (English)", language: "en", durationSec: 600, minWords: 300, qualifyingWpm: 30, qualificationBasis: "net", netMethod: "rrb", errorAllowancePercent: 5 },
  "rrb-ntpc-hi": { ...base, id: "rrb-ntpc-hi", label: "RRB NTPC CBTST (Hindi)", language: "hi", durationSec: 600, minWords: 250, qualifyingWpm: 25, qualificationBasis: "net", netMethod: "rrb", errorAllowancePercent: 5 },
  "delhi-police-hcm-en": {
    ...base, id: "delhi-police-hcm-en", label: "Delhi Police Head Constable (Ministerial) — English",
    language: "en", unit: "words", durationSec: 600, qualifyingWpm: 30,
    fullErrorWeight: 1, halfErrorWeight: 0, halfRules: { caseOnly: false, punctuationOnly: false },
    netMethod: "per-error", errorPercentBasis: "referenceWords",
  },
  "delhi-police-hcm-hi": {
    ...base, id: "delhi-police-hcm-hi", label: "Delhi Police Head Constable (Ministerial) — Hindi",
    language: "hi", unit: "words", durationSec: 600, qualifyingWpm: 25,
    fullErrorWeight: 1, halfErrorWeight: 0, halfRules: { caseOnly: false, punctuationOnly: false },
    netMethod: "per-error", errorPercentBasis: "referenceWords",
  },
  "court-typing-en": { ...base, id: "court-typing-en", label: "Court Typing (English; court-specific rules required)", language: "en" },
  "delhi-high-court-jja-en": {
    ...base, id: "delhi-high-court-jja-en", label: "Delhi High Court JJA/Restorer 2026 (English)",
    language: "en", durationSec: 600, qualifyingWpm: 35, qualificationBasis: "gross", maxErrorPercent: 3,
    halfRules: { caseOnly: false, punctuationOnly: false },
  },
  "court-typing-hi": { ...base, id: "court-typing-hi", label: "Court Typing (Hindi; court-specific rules required)", language: "hi" },
  "bsf-typing-en": { ...base, id: "bsf-typing-en", label: "BSF HCM (English; verify recruitment notification)", language: "en" },
  "high-court": { ...base, id: "high-court", label: "High Court clerical (editable)" },
  practice: { ...base, id: "practice", label: "Free practice" },
};
