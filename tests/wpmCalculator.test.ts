import test from "node:test";
import assert from "node:assert/strict";
import { calculateScore, PROFILES, analyzeKeyLog, type KeyEvent } from "../lib/wpmCalculator.ts";
import { checkEdit } from "../lib/backspacePolicy.ts";

const P = { ...PROFILES.practice };
const ref = "the quick brown fox jumps over the lazy dog";
const run = (typed: string, sec = 60) => calculateScore({ reference: ref, typed, elapsedSec: sec, durationSec: 600, profile: P });

test("perfect typing has no errors and 100% accuracy", () => {
  const r = run(ref);
  assert.equal(r.fullErrors, 0);
  assert.equal(r.accuracy, 100);
  assert.equal(r.grossWpm, r.netWpm);
});

test("gross WPM uses 5 characters per word", () => {
  const r = run("a".repeat(250), 60);
  assert.equal(r.grossWpm, 50);
});

test("substitution is one full mistake and costs penalty per minute", () => {
  const r = run("the quick brown fax jumps over the lazy dog", 60);
  assert.equal(r.fullErrors, 1);
  assert.equal(r.penaltyWpm, 1);
});

test("case-only and punctuation-only differences are half mistakes", () => {
  const r = run("The quick brown fox, jumps over the lazy dog");
  assert.equal(r.halfErrors, 2);
  assert.equal(r.fullErrors, 0);
  assert.equal(r.errorUnits, 1);
});

test("omitted and extra words are full mistakes", () => {
  assert.equal(run("the quick fox jumps over the lazy dog").fullErrors, 1);
  assert.equal(run("the quick brown brown fox jumps over the lazy dog").fullErrors, 1);
});

test("a short attempt is not punished for the unreached passage", () => {
  const r = run("the quick brown fox", 30);
  assert.equal(r.fullErrors, 0);
  assert.equal(r.referenceWordsReached, 4);
});

test("Hindi text is compared exactly, matra differences count", () => {
  const hi = { ...P };
  const r = calculateScore({ reference: "भारत एक देश है", typed: "भारत एक दश है", elapsedSec: 60, durationSec: 600, profile: hi });
  assert.equal(r.fullErrors, 1);
});

test("fixed vs ignored errors come from the key log", () => {
  const ev: KeyEvent[] = [
    { t: 1, type: "ins", ch: "t" }, { t: 2, type: "ins", ch: "x" },
    { t: 3, type: "del", n: 1 }, { t: 4, type: "ins", ch: "h" }, { t: 5, type: "ins", ch: "z" },
  ];
  const a = analyzeKeyLog(ev, "the");
  assert.equal(a.fixed, 1);
  assert.equal(a.ignored, 1);
  assert.equal(a.backspaces, 1);
});

test("pass rule uses net WPM and error percent", () => {
  const prof = { ...P, qualifyingWpm: 10, maxErrorPercent: 5 };
  const r = calculateScore({ reference: ref, typed: ref.repeat(1), elapsedSec: 30, durationSec: 600, profile: prof });
  assert.equal(r.passed, true);
});


test("SSC CHSL profile uses a 10-minute timer and gross-speed qualification", () => {
  assert.equal(PROFILES["ssc-chsl-en"].durationSec, 600);
  assert.equal(PROFILES["ssc-chsl-en"].qualifyingWpm, 35);
  assert.equal(PROFILES["ssc-chsl-hi"].qualifyingWpm, 30);
  assert.equal(PROFILES["ssc-chsl-en"].qualificationBasis, "gross");
});

test("SSC CGL DEST is a 15-minute practice target, not an invented WPM pass rule", () => {
  const p = PROFILES["ssc-cgl-dest"];
  assert.equal(p.durationSec, 900);
  assert.equal(p.targetKeystrokes, 2000);
  assert.equal(p.qualifyingWpm, undefined);
});

test("RRB CBTST applies its 5 percent allowance and official speed formula", () => {
  const referenceWords = Array.from({ length: 400 }, (_, i) => `word${String(i).padStart(3, "0")}`);
  const typedWords = [...referenceWords];
  for (let i = 0; i < 30; i++) typedWords[i] = `wrong${String(i).padStart(3, "0")}`;
  const r = calculateScore({
    reference: referenceWords.join(" "),
    typed: typedWords.join(" "),
    elapsedSec: 600,
    durationSec: 600,
    profile: PROFILES["rrb-ntpc-en"],
  });
  assert.equal(r.typedWords, 400);
  assert.equal(r.fullErrors, 30);
  assert.equal(r.netWpm, 30);
  assert.equal(r.passed, true);
});

test("backspace policies", () => {
  assert.equal(checkEdit("ab", "a", "full").ok, true);
  assert.equal(checkEdit("ab", "a", "disabled").ok, false);
  assert.equal(checkEdit("ab cd", "ab c", "word").ok, true);
  assert.equal(checkEdit("ab ", "ab", "word").ok, false);
  assert.equal(checkEdit("ab", "xb", "full").ok, false);
});

import { analyzeEvents } from "../lib/analytics.ts";
test("analytics finds weak keys from the key log", () => {
  const ev: KeyEvent[] = [
    { t: 100, type: "ins", ch: "t" }, { t: 200, type: "ins", ch: "x" }, { t: 300, type: "ins", ch: "e" },
  ];
  const a = analyzeEvents(ev, "the");
  assert.equal(a.keys["h"].errors, 1);
  assert.equal(a.timeline[0].wrong, 1);
});

import { fingerFor, baseKey, needsShift, buildDrill, ALL_LESSONS } from "../lib/lessons.ts";
test("finger map and shift helpers", () => {
  assert.equal(fingerFor("a")?.name, "Left pinky");
  assert.equal(fingerFor("j")?.name, "Right index");
  assert.equal(fingerFor("!")?.name, "Left pinky");
  assert.equal(baseKey("%"), "5");
  assert.equal(needsShift("A"), true);
  assert.equal(needsShift("a"), false);
});
test("every lesson drill uses only its own keys and every key has a finger", () => {
  for (const l of ALL_LESSONS) {
    const d = buildDrill(l.keys, 60);
    assert.ok(Array.from(d).every((c) => c === " " || l.keys.includes(c)), l.id);
    assert.ok(Array.from(l.keys).every((c) => fingerFor(c)), l.id);
  }
});

import { validatePassage, parseBulk, validateTemplate, defaultScoring, countWords } from "../lib/adminValidation.ts";
const en30 = Array.from({ length: 35 }, (_, i) => "word" + i).join(" ");
test("passage validation: length, script and warnings", () => {
  assert.equal(validatePassage({ title: "A", language: "en", body: en30 }).ok, true);
  assert.equal(validatePassage({ title: "", language: "en", body: en30 }).ok, false);
  assert.equal(validatePassage({ title: "A", language: "en", body: "too short" }).ok, false);
  assert.equal(validatePassage({ title: "A", language: "hi", body: en30 }).ok, false);
  const hi = Array.from({ length: 35 }, () => "भारत").join(" ");
  assert.equal(validatePassage({ title: "ह", language: "hi", body: hi }).ok, true);
  assert.equal(validatePassage({ title: "ह", language: "en", body: hi }).ok, false);
  assert.ok(validatePassage({ title: "A", language: "en", body: en30 + " “quoted”" }).warnings.length > 0);
});
test("body is cleaned of hidden characters", () => {
  const r = validatePassage({ title: "A", language: "en", body: "\uFEFF" + en30 + "\u200B  \r\n" });
  assert.equal(r.clean.body, en30);
  assert.equal(countWords(r.clean.body), 35);
});
test("bulk parsing with and without titles", () => {
  const items = parseBulk(`# First\nhello world one\n---\nsecond passage text here`);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "First");
  assert.equal(items[1].title, "second passage text here");
});
test("template validation", () => {
  const ok = { slug: "ssc-cgl", name: "SSC CGL", language: "en" as const, durationSec: 900, displayMode: "highlighted" as const, backspace: "full" as const, scoring: defaultScoring("ssc-cgl-dest") };
  assert.equal(validateTemplate(ok).errors.length, 0);
  assert.ok(validateTemplate({ ...ok, slug: "Bad Slug" }).errors.length > 0);
  assert.ok(validateTemplate({ ...ok, durationSec: 5 }).errors.length > 0);
  assert.ok(validateTemplate({ ...ok, scoring: { ...ok.scoring, maxErrorPercent: 500 } }).errors.length > 0);
  assert.ok(validateTemplate({ ...ok, scoring: null }).errors.length > 0);
});

import { effectivePlan, extendedEnd, testsLeft, priceFor, LIMITS } from "../lib/plans.ts";

test("plan is pro only while an active subscription has not ended", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  const sub = (status: string, ends: string | null) => ({ plan: "pro", status, ends_at: ends });
  assert.equal(effectivePlan(sub("active", "2026-11-01T00:00:00Z"), now), "pro");
  assert.equal(effectivePlan(sub("active", "2026-10-01T00:00:00Z"), now), "free");
  assert.equal(effectivePlan(sub("cancelled", "2026-11-01T00:00:00Z"), now), "free");
  assert.equal(effectivePlan(sub("active", null), now), "free");
  assert.equal(effectivePlan(null, now), "free");
});
test("buying again adds to remaining time, expired plans start from now", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  assert.equal(extendedEnd("2026-11-05T00:00:00Z", 30, now).toISOString(), "2026-12-05T00:00:00.000Z");
  assert.equal(extendedEnd("2026-10-01T00:00:00Z", 30, now).toISOString(), "2026-11-25T00:00:00.000Z");
  assert.equal(extendedEnd(null, 365, now).toISOString(), "2027-10-26T00:00:00.000Z");
});
test("daily test limit and price overrides", () => {
  assert.equal(testsLeft("free", 0), LIMITS.free.testsPerDay);
  assert.equal(testsLeft("free", 99), 0);
  assert.equal(testsLeft("pro", 99), null);
  assert.equal(priceFor("monthly", { PRO_MONTHLY_PAISE: "19900" }), 9900);
  assert.equal(priceFor("monthly", { PRO_MONTHLY_PAISE: "abc" }), 9900);
  assert.equal(priceFor("yearly", { PRO_YEARLY_PAISE: "99900" }), 79900);
  assert.equal(LIMITS.free.historyRows, 10);
  assert.equal(LIMITS.pro.aiFeedback, false);
});
import { decideLink } from "../lib/identity.ts";
test("identity linking never lets an unverified email claim an existing account", () => {
  const row = { id: "u1", auth_id: null };
  assert.deepEqual(decideLink({ id: "u9", auth_id: "a" }, null, false), { action: "use", id: "u9" });
  assert.deepEqual(decideLink(null, row, true), { action: "link", id: "u1" });
  assert.deepEqual(decideLink(null, row, false), { action: "block" });
  assert.deepEqual(decideLink(null, { id: "u1", auth_id: "someone-else" }, true), { action: "block" });
  assert.deepEqual(decideLink(null, null, false), { action: "create" });
});

import { dailyPick, buildReference, minCharsFor, istDate, fileName, passageFile, recentDates } from "../lib/library.ts";
import { charDiff, annotate, mistakePatterns } from "../lib/diff.ts";
import { validateAttempt, replayEvents } from "../lib/antiCheat.ts";
import { genJoinCode, normalizeJoinCode, csvCell, toCsv, validateInstitution, isStaff } from "../lib/institution.ts";

test("daily passage is stable per day and language", () => {
  const items = ["a", "b", "c", "d", "e"];
  assert.equal(dailyPick(items, "2026-10-26", "en"), dailyPick(items, "2026-10-26", "en"));
  const picks = new Set(recentDates(30, new Date("2026-10-26T00:00:00Z")).map((d) => dailyPick(items, d, "en")));
  assert.ok(picks.size > 1);
  assert.equal(dailyPick([], "2026-10-26", "en"), null);
  assert.equal(istDate(new Date("2026-10-25T20:00:00Z")), "2026-10-26"); // already the next day in India
});
test("reference text is long enough for the whole timer", () => {
  assert.ok(buildReference(["short passage here"], 500).length >= 500);
  assert.equal(minCharsFor(600), 5000);
  assert.equal(buildReference([], 100), "");
});
test("download file names and Hindi-safe encoding", () => {
  assert.equal(fileName("SSC Typing: Test #1!", "en", "2026-10-26"), "2026-10-26-en-ssc-typing-test-1.txt");
  assert.equal(fileName("भारत", "hi"), "hi-passage.txt");
  assert.ok(passageFile({ title: "T", language: "hi", body: "a\nb" }).startsWith("\uFEFF"));
});
test("char diff shows missing and extra letters", () => {
  assert.deepEqual(charDiff("quik", "quick"), [{ t: "same", s: "qui" }, { t: "missing", s: "c" }, { t: "same", s: "k" }]);
  assert.deepEqual(charDiff("cat", "cat"), [{ t: "same", s: "cat" }]);
});
test("mistake patterns find letter confusions and omissions", () => {
  const ops = [
    { op: "full" as const, typed: "fax", ref: "fox" }, { op: "full" as const, typed: "bax", ref: "box" },
    { op: "omit" as const, ref: "the" }, { op: "extra" as const, typed: "uh" }, { op: "ok" as const, typed: "a", ref: "a" },
  ];
  const p = mistakePatterns(ops);
  assert.equal(p.confusions[0].from, "o");
  assert.equal(p.confusions[0].to, "a");
  assert.equal(p.confusions[0].count, 2);
  assert.equal(p.omitted, 1);
  assert.equal(p.extra, 1);
  assert.equal(annotate(ops)[0].segs?.some((s) => s.t === "extra"), true);
});
test("anti-cheat: tampered text rejected, impossible speed flagged", () => {
  const ins = (s: string, t0 = 0) => Array.from(s).map((ch, i) => ({ t: t0 + i * 100, type: "ins" as const, ch }));
  const ev = ins("hello");
  assert.equal(replayEvents(ev), "hello");
  assert.equal(validateAttempt({ typed: "hello", events: ev, elapsedSec: 10, durationSec: 60 }).tampered, false);
  assert.equal(validateAttempt({ typed: "hellp", events: ev, elapsedSec: 10, durationSec: 60 }).tampered, true);
  assert.equal(validateAttempt({ typed: "", events: [{ t: 5, type: "ins", ch: "a" }, { t: 1, type: "ins", ch: "b" }], elapsedSec: 1, durationSec: 60 }).tampered, true);
  const fast = ins("a".repeat(600), 0).map((e, i) => ({ ...e, t: i * 10 })); // 100 chars a second
  const r = validateAttempt({ typed: "a".repeat(600), events: fast, elapsedSec: 6, durationSec: 60 });
  assert.equal(r.tampered, false);
  assert.equal(r.flagged, true);
  assert.equal(validateAttempt({ typed: "hi", events: ins("hi"), elapsedSec: 0, durationSec: 60 }).elapsedSec, 0.1);
});
test("institution helpers", () => {
  const c = genJoinCode();
  assert.match(c, /^[A-HJ-KM-NP-Z2-9]{8}$/);
  assert.equal(normalizeJoinCode(" ab-cd 12 "), "ABCD12");
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.ok(toCsv([["a", 1]]).startsWith("\uFEFF"));
  assert.equal(validateInstitution({ name: "Sharma Typing", city: "Nawada", state: "Bihar", phone: "9876543210" }).length, 0);
  assert.ok(validateInstitution({ name: "x", phone: "12" }).length >= 3);
  assert.equal(isStaff("teacher"), true);
  assert.equal(isStaff("student"), false);
});


test("scoring rejects invalid duration and invalid profile values", () => {
  assert.throws(() => calculateScore({ reference: ref, typed: ref, elapsedSec: 10, durationSec: 0, profile: P }), /durationSec/);
  assert.throws(() => calculateScore({ reference: ref, typed: ref, elapsedSec: -1, durationSec: 60, profile: P }), /elapsedSec/);
  assert.throws(() => calculateScore({ reference: ref, typed: ref, elapsedSec: 10, durationSec: 60, profile: { ...P, charsPerWord: 0 } }), /charsPerWord/);
});

test("exam profile selects its own error percentage denominator", () => {
  const baseInput = { reference: "one two three four five", typed: "one two wrong", elapsedSec: 60, durationSec: 60, profile: P };
  const typedBasis = calculateScore(baseInput);
  const referenceBasis = calculateScore({ ...baseInput, profile: { ...P, errorPercentBasis: "referenceWords" } });
  assert.equal(typedBasis.errorPercent, 33.33);
  assert.equal(referenceBasis.errorPercent, 20);
});

test("Unicode code points are counted consistently for Hindi", () => {
  const r = calculateScore({ reference: "किताब भारत", typed: "किताब भारत", elapsedSec: 60, durationSec: 60, profile: { ...P, language: "hi" } });
  assert.equal(r.typedWords, 2);
  assert.equal(r.typedChars, Array.from("किताब भारत").length);
  assert.equal(r.accuracy, 100);
});

test("key log rejects invalid event order and malformed deletion lengths", () => {
  assert.throws(() => analyzeKeyLog([{ t: 5, type: "ins", ch: "a" }, { t: 4, type: "ins", ch: "b" }], "ab"), /non-decreasing/);
  assert.throws(() => analyzeKeyLog([{ t: 1, type: "del", n: 0 }], "a"), /positive integer/);
});


test("anti-cheat rejects malformed key events without throwing", () => {
  assert.equal(validateAttempt({ typed: "a", events: [null as unknown as KeyEvent], elapsedSec: 1, durationSec: 60 }).tampered, true);
  assert.equal(validateAttempt({ typed: "a", events: [{ t: Number.NaN, type: "ins", ch: "a" }], elapsedSec: 1, durationSec: 60 }).tampered, true);
  assert.equal(validateAttempt({ typed: "a", events: [{ t: 1, type: "del", n: 0 }], elapsedSec: 1, durationSec: 60 }).tampered, true);
  assert.equal(validateAttempt({ typed: "ab", events: [{ t: 1, type: "ins", ch: "ab" }], elapsedSec: 1, durationSec: 60 }).tampered, true);
});


test("Delhi Police HCM uses 10-minute scoring, one full WPM per error, and official mark bands", () => {
  const profile = PROFILES["delhi-police-hcm-en"];
  const reference = Array.from({ length: 400 }, (_, i) => i === 10 ? "abcde" : "abcd").join(" ");
  const typed = Array.from({ length: 400 }, (_, i) => i < 10 ? "abxd" : i === 10 ? "abcde" : "abcd").join(" ");
  const r = calculateScore({ reference, typed, elapsedSec: 600, durationSec: 600, profile });
  assert.equal(profile.durationSec, 600);
  assert.equal(profile.qualifyingWpm, 30);
  assert.equal(profile.halfErrorWeight, 0);
  assert.equal(profile.halfRules.caseOnly, false);
  assert.equal(r.grossWpm, 40);
  assert.equal(r.fullErrors, 10);
  assert.equal(r.halfErrors, 0);
  assert.equal(r.netWpm, 30);
  assert.equal(r.passed, true);
  assert.equal(r.marks, 10);
});

test("Delhi Police HCM Hindi qualification and marks use Hindi thresholds", () => {
  const profile = PROFILES["delhi-police-hcm-hi"];
  const reference = Array.from({ length: 250 }, () => "भारत").join(" ");
  const typed = Array.from({ length: 250 }, (_, i) => i < 5 ? "भारती" : "भारत").join(" ");
  const r = calculateScore({ reference, typed, elapsedSec: 600, durationSec: 600, profile });
  assert.equal(r.grossWpm, 25);
  assert.equal(r.netWpm, 19.98);
  assert.equal(r.passed, false);
  assert.equal(r.marks, 0);
});
