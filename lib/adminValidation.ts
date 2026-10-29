import { PROFILES, type Lang, type ScoringProfile } from "./wpmCalculator.ts";

const DEVANAGARI = /[\u0900-\u097F]/g;
const LETTERS = /[\p{L}\p{M}]/gu;

export interface PassageInput { title: string; language: Lang; body: string }
export interface Checked<T> { ok: boolean; errors: string[]; warnings: string[]; clean: T }

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Normalise pasted text: NFC, unify line breaks and spaces, drop BOM and zero-width spaces (keeps ZWJ/ZWNJ used in Hindi). */
export function cleanBody(s: string) {
  return s.normalize("NFC").replace(/[\uFEFF\u200B\u00A0]/g, " ").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function validatePassage(p: PassageInput): Checked<PassageInput> {
  const errors: string[] = [], warnings: string[] = [];
  const title = p.title.trim().slice(0, 120);
  const body = cleanBody(p.body);
  if (!title) errors.push("Add a title.");
  if (p.language !== "en" && p.language !== "hi") errors.push("Choose English or Hindi.");
  const words = countWords(body);
  if (words < 30) errors.push(`Passage has ${words} words. Use at least 30.`);
  if (words > 5000) errors.push("Passage is longer than 5000 words.");
  const letters = (body.match(LETTERS) ?? []).length || 1;
  const dev = (body.match(DEVANAGARI) ?? []).length;
  if (p.language === "hi" && dev / letters < 0.5) errors.push("This is marked Hindi but most letters are not Devanagari.");
  if (p.language === "en" && dev / letters > 0.05) errors.push("This is marked English but contains Devanagari text.");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body)) errors.push("Passage contains hidden control characters.");
  if (/[“”‘’]/.test(body)) warnings.push("Curly quotes found. Students must type them exactly, which most keyboards cannot do. Consider straight quotes.");
  if (/\n/.test(body)) warnings.push("Line breaks found. Students will need to press Enter at each one.");
  if (/ {2}/.test(body)) warnings.push("Double spaces found.");
  return { ok: errors.length === 0, errors, warnings, clean: { title, language: p.language, body } };
}

/** Bulk file format: passages separated by a line containing only ---. Optional first line "# Title". */
export function parseBulk(text: string): { title: string; body: string }[] {
  return text.replace(/^\uFEFF/, "").split(/^\s*---\s*$/m).map((b) => b.trim()).filter(Boolean).map((block, i) => {
    const lines = block.split(/\r?\n/);
    if (lines[0].startsWith("#")) return { title: lines[0].replace(/^#+\s*/, "").trim(), body: lines.slice(1).join("\n") };
    const body = block;
    return { title: body.split(/\s+/).slice(0, 6).join(" ") || `Passage ${i + 1}`, body };
  });
}

export interface TemplateInput {
  slug: string; name: string; language: Lang; durationSec: number;
  displayMode: "highlighted" | "unhighlighted" | "offscreen";
  backspace: "full" | "word" | "disabled";
  scoring: unknown; isActive?: boolean;
}

const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

export function validateScoring(raw: unknown): { scoring?: ScoringProfile; error?: string } {
  const s = raw as Partial<ScoringProfile> | null;
  if (!s || typeof s !== "object") return { error: "Scoring settings are missing." };
  if (s.unit !== "words" && s.unit !== "keystrokes") return { error: "Count by words or keystrokes." };
  if (s.netMethod !== "penalty" && s.netMethod !== "accuracy" && s.netMethod !== "per-error" && s.netMethod !== "rrb") return { error: "Choose a net speed method." };
  if (!num(s.charsPerWord, 1, 10)) return { error: "Characters per word must be between 1 and 10." };
  if (!num(s.fullErrorWeight, 0, 5) || !num(s.halfErrorWeight, 0, 5)) return { error: "Mistake weights must be between 0 and 5." };
  if (s.qualifyingWpm !== undefined && !num(s.qualifyingWpm, 0, 200)) return { error: "Qualifying WPM must be between 0 and 200." };
  if (s.maxErrorPercent !== undefined && !num(s.maxErrorPercent, 0, 100)) return { error: "Maximum error % must be between 0 and 100." };
  if (s.errorAllowancePercent !== undefined && !num(s.errorAllowancePercent, 0, 100)) return { error: "Error allowance % must be between 0 and 100." };
  if (s.qualificationBasis !== undefined && s.qualificationBasis !== "gross" && s.qualificationBasis !== "net") return { error: "Choose gross or net speed for qualification." };
  if (s.minWords !== undefined && !num(s.minWords, 1, 10000)) return { error: "Minimum words must be between 1 and 10000." };
  if (s.targetKeystrokes !== undefined && !num(s.targetKeystrokes, 1, 100000)) return { error: "Target keystrokes must be between 1 and 100000." };
  return {
    scoring: {
      id: String(s.id ?? "custom").slice(0, 40), label: String(s.label ?? "Custom").slice(0, 80),
      unit: s.unit, netMethod: s.netMethod, charsPerWord: s.charsPerWord!, fullErrorWeight: s.fullErrorWeight!, halfErrorWeight: s.halfErrorWeight!,
      halfRules: { caseOnly: !!s.halfRules?.caseOnly, punctuationOnly: !!s.halfRules?.punctuationOnly },
      ...(s.errorPercentBasis ? { errorPercentBasis: s.errorPercentBasis } : {}),
      ...(s.errorAllowancePercent !== undefined ? { errorAllowancePercent: s.errorAllowancePercent } : {}),
      ...(s.qualificationBasis ? { qualificationBasis: s.qualificationBasis } : {}),
      ...(s.minWords !== undefined ? { minWords: s.minWords } : {}),
      ...(s.targetKeystrokes !== undefined ? { targetKeystrokes: s.targetKeystrokes } : {}),
      ...(s.durationSec !== undefined ? { durationSec: s.durationSec } : {}),
      ...(s.qualifyingWpm !== undefined ? { qualifyingWpm: s.qualifyingWpm } : {}),
      ...(s.maxErrorPercent !== undefined ? { maxErrorPercent: s.maxErrorPercent } : {}),
    },
  };
}

export function validateTemplate(t: TemplateInput): { errors: string[]; scoring?: ScoringProfile } {
  const errors: string[] = [];
  if (!/^[a-z0-9-]{2,40}$/.test(t.slug)) errors.push("Slug: 2 to 40 characters, lowercase letters, numbers and hyphens.");
  if (t.name.trim().length < 2 || t.name.length > 80) errors.push("Name must be 2 to 80 characters.");
  if (t.language !== "en" && t.language !== "hi") errors.push("Choose English or Hindi.");
  if (!num(t.durationSec, 30, 3600)) errors.push("Duration must be between 30 seconds and 60 minutes.");
  if (!["highlighted", "unhighlighted", "offscreen"].includes(t.displayMode)) errors.push("Unknown display mode.");
  if (!["full", "word", "disabled"].includes(t.backspace)) errors.push("Unknown backspace rule.");
  const sc = validateScoring(t.scoring);
  if (sc.error) errors.push(sc.error);
  return { errors, scoring: sc.scoring };
}

export const defaultScoring = (id: string): ScoringProfile => ({ ...(PROFILES[id] ?? PROFILES.practice) });
