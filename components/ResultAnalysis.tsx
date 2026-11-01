"use client";
import { useMemo, useState } from "react";
import type { KeyEvent, ScoreResult } from "@/lib/wpmCalculator";
import { KeyHeatmap, LineChart } from "./charts";
import ComparisonView from "./ComparisonView";
import { accuracyDrops, analyzeEvents, coachNotes } from "@/lib/analytics";
import { mistakePatterns } from "@/lib/diff";
import { post } from "@/lib/clientApi";

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

interface Evaluation {
  profileId: string;
  profileLabel: string;
  unit: "words" | "keystrokes";
  charsPerWord: number;
  fullErrorWeight: number;
  halfErrorWeight: number;
  halfRules: { caseOnly: boolean; punctuationOnly: boolean };
  errorPercentBasis: "typedWords" | "referenceWordsReached" | "referenceWords";
  netMethod: "penalty" | "accuracy" | "per-error" | "rrb";
  qualificationBasis: "gross" | "net";
  qualifyingWpm: number | null;
  errorAllowancePercent: number | null;
  maxErrorPercent: number | null;
  minWords: number | null;
  targetKeystrokes: number | null;
}

export default function ResultAnalysis({ reference, events, score: s, evaluation }: { reference: string; events: KeyEvent[]; score: ScoreResult; evaluation?: Evaluation }) {
  const [ai, setAi] = useState<string | null>(null);
  const a = useMemo(() => analyzeEvents(events, reference), [events, reference]);
  const drops = useMemo(() => accuracyDrops(a.timeline, s.accuracy), [a, s.accuracy]);
  const notes = useMemo(() => coachNotes(s, a.weakCombos, drops), [s, a, drops]);
  const pat = useMemo(() => mistakePatterns(s.wordOps), [s]);
  const hindi = /[\u0900-\u097F]/.test(reference);

  const askAi = async () => {
    setAi("Writing feedback…");
    const r = await post("/api/feedback", { score: { ...s, wordOps: undefined }, combos: a.weakCombos, drops });
    setAi(r.ok ? r.data.text : r.data.error ?? "AI feedback is not available right now.");
  };

  return (
    <div className="dash">
      <div className="tiles">
        <div><b>{s.netWpm}</b><span>Net WPM</span></div>
        <div><b>{s.grossWpm}</b><span>Gross WPM</span></div>
        <div><b>{s.accuracy}%</b><span>Accuracy</span></div>
        <div><b>{s.errorUnits}</b><span>Weighted error units</span></div>
        <div><b>{s.fixedErrors} / {s.ignoredErrors}</b><span>Fixed / ignored characters</span></div>
        <div><b>−{s.penaltyWpm}</b><span>Penalty WPM</span></div>
        {typeof s.marks === "number" && <div><b>{s.marks}/25</b><span>Delhi Police HCM marks</span></div>}
        {typeof s.passed === "boolean" && <div><b>{s.passed ? "PASS" : "NOT QUALIFIED"}</b><span>Configured qualification rule</span></div>}
      </div>

      {evaluation && (
        <section className="panel exam-evaluation" aria-label="Exam evaluation rules">
          <h2>Exam-specific evaluation</h2>
          <p className="hint">{evaluation.profileLabel}</p>
          <div className="tiles">
            <div><b>{evaluation.unit === "keystrokes" ? "Key depressions" : "Words"}</b><span>Scoring unit</span></div>
            <div><b>{evaluation.qualificationBasis === "gross" ? "Gross WPM" : "Net WPM"}</b><span>Qualification speed basis</span></div>
            {evaluation.qualifyingWpm !== null && <div><b>{evaluation.qualifyingWpm} WPM</b><span>Configured minimum speed</span></div>}
            {evaluation.errorAllowancePercent !== null && <div><b>{evaluation.errorAllowancePercent}%</b><span>Configured error allowance</span></div>}
            {evaluation.maxErrorPercent !== null && <div><b>{evaluation.maxErrorPercent}%</b><span>Maximum error percentage</span></div>}
            {evaluation.minWords !== null && <div><b>{evaluation.minWords}</b><span>Minimum words required</span></div>}
            {evaluation.targetKeystrokes !== null && <div><b>{evaluation.targetKeystrokes}</b><span>Target key depressions</span></div>}
          </div>
          <div className="tiles">
            <div><b>{s.fullErrors}</b><span>Full errors · weight {evaluation.fullErrorWeight}</span></div>
            {evaluation.halfErrorWeight > 0 && <div><b>{s.halfErrors}</b><span>Half errors · weight {evaluation.halfErrorWeight}</span></div>}
            <div><b>{s.errorUnits}</b><span>Total weighted error units</span></div>
          </div>
          <p className="hint">Error percentage is measured against {evaluation.errorPercentBasis === "referenceWords" ? "all reference words" : evaluation.errorPercentBasis === "referenceWordsReached" ? "reference words reached" : "typed words"}.</p>
          <p className="hint">{evaluation.halfErrorWeight === 0
            ? "This profile does not award half-error treatment; differences are evaluated as full errors."
            : evaluation.halfErrorWeight === evaluation.fullErrorWeight
              ? "Half-classified differences carry the same scoring weight as full errors in this profile."
              : "Half-classified differences use a reduced weight under this profile."}</p>
          <p className="hint">{evaluation.netMethod === "rrb"
            ? "This profile applies its configured error allowance before calculating the net speed."
            : evaluation.netMethod === "per-error"
              ? "This profile deducts its configured weighted error count from gross speed."
              : evaluation.netMethod === "penalty"
                ? "This profile calculates net speed by deducting its configured error penalty."
                : "This profile calculates net speed using its configured accuracy method."}</p>
          <p className="hint">This report uses the scoring profile saved for this attempt. Where the profile is marked provisional or notification-dependent, verify the current recruitment notice before treating qualification as official.</p>
        </section>
      )}

      <h2>Your text against the reference</h2>
      <ComparisonView ops={s.wordOps} hindi={hindi} />

      <h2>Mistakes under this exam's scoring rules</h2>
      <div className="pat">
        {(!evaluation || evaluation.fullErrorWeight > 0) && <div><h3>Full-error letter patterns</h3>{pat.confusions.length || pat.missingLetters.length || pat.extraLetters.length ? <>
          {pat.confusions.length > 0 && <ul>{pat.confusions.map((item) => <li key={item.from + item.to}>Expected <b>{item.from}</b>, typed <b>{item.to}</b> ×{item.count}</li>)}</ul>}
          {pat.missingLetters.length > 0 && <p>Missing: {pat.missingLetters.map((item) => `${item.ch} ×${item.count}`).join(", ")}</p>}
          {pat.extraLetters.length > 0 && <p>Extra: {pat.extraLetters.map((item) => `${item.ch} ×${item.count}`).join(", ")}</p>}
        </> : <p className="hint">No full-error letter patterns found.</p>}</div>}
        <div><h3>Full-error words</h3>{pat.wrongWords.length ? <ul>{pat.wrongWords.map((w) => <li key={w.ref + w.typed}><b>{w.ref}</b> → <s>{w.typed}</s></li>)}</ul> : <p className="hint">None found.</p>}</div>
        {evaluation && evaluation.halfErrorWeight > 0 && <div><h3>Half-error words</h3>{s.wordOps.filter((op) => op.op === "half").length ? <ul>{s.wordOps.filter((op) => op.op === "half").map((op, i) => op.op === "half" ? <li key={i}><b>{op.ref}</b> → <s>{op.typed}</s></li> : null)}</ul> : <p className="hint">None found.</p>}</div>}
        <div><h3>Omitted and extra words</h3>{pat.omitted || pat.extra ? <p>{pat.omitted} omitted · {pat.extra} extra</p> : <p className="hint">None found.</p>}</div>
      </div>
      {(pat.omitted > 0 || pat.extra > 0) && <p>You skipped {pat.omitted} word{pat.omitted === 1 ? "" : "s"} and added {pat.extra} extra.</p>}

      {events.length > 0 && (<>
        <h2>Speed during the exam</h2>
        <LineChart labels={a.timeline.map((b) => mmss(b.startSec))} series={[{ label: "Net WPM", color: "#16233b", values: a.timeline.map((b) => b.wpm) }]} />
        <h2>Accuracy during the exam</h2>
        <LineChart labels={a.timeline.map((b) => mmss(b.startSec))} series={[{ label: "Accuracy %", color: "#1f7a4d", values: a.timeline.map((b) => b.accuracy) }]} yMax={100} marks={a.timeline.map((b, i) => (drops.includes(b.startSec) ? i : -1)).filter((i) => i >= 0)} />
        <p className="hint">Red bands mark time intervals where accuracy fell clearly below your overall exam accuracy.</p>
        <h2>Keys that cost you</h2>
        <KeyHeatmap keys={a.keys} hindi={hindi} />
        {a.weakCombos.length > 0 && <p>Weak letter pairs: {a.weakCombos.map((c) => `${c.pair} (${c.errors}/${c.attempts})`).join(", ")}</p>}
      </>)}

      <h2>Coaching</h2>
      <ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      {ai ? <p className="ai">{ai}</p> : <button className="go" onClick={askAi}>Get AI feedback</button>}
    </div>
  );
}
