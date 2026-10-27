"use client";
import { useMemo, useState } from "react";
import type { KeyEvent, ScoreResult } from "@/lib/wpmCalculator";
import { KeyHeatmap, LineChart } from "./charts";
import ComparisonView from "./ComparisonView";
import { accuracyDrops, analyzeEvents, coachNotes } from "@/lib/analytics";
import { mistakePatterns } from "@/lib/diff";
import { post } from "@/lib/clientApi";

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export default function ResultAnalysis({ reference, events, score: s }: { reference: string; events: KeyEvent[]; score: ScoreResult }) {
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
        <div><b>{s.fullErrors} + {s.halfErrors}/2</b><span>Full + half mistakes</span></div>
        <div><b>{s.fixedErrors} / {s.ignoredErrors}</b><span>Fixed / ignored characters</span></div>
        <div><b>−{s.penaltyWpm}</b><span>Penalty WPM</span></div>
      </div>

      <h2>Your text against the reference</h2>
      <ComparisonView ops={s.wordOps} hindi={hindi} />

      <h2>Your mistake pattern</h2>
      <div className="pat">
        <div><h3>Letters you mix up</h3>{pat.confusions.length ? <ul>{pat.confusions.map((c) => <li key={c.from + c.to}>should be <b>{c.from}</b>, typed <b>{c.to}</b> ×{c.count}</li>)}</ul> : <p className="hint">None found.</p>}</div>
        <div><h3>Letters you drop</h3>{pat.missingLetters.length ? <ul>{pat.missingLetters.map((c) => <li key={c.ch}><b>{c.ch}</b> ×{c.count}</li>)}</ul> : <p className="hint">None found.</p>}</div>
        <div><h3>Extra letters</h3>{pat.extraLetters.length ? <ul>{pat.extraLetters.map((c) => <li key={c.ch}><b>{c.ch}</b> ×{c.count}</li>)}</ul> : <p className="hint">None found.</p>}</div>
        <div><h3>Words you got wrong</h3>{pat.wrongWords.length ? <ul>{pat.wrongWords.map((w) => <li key={w.ref + w.typed}><b>{w.ref}</b> → <s>{w.typed}</s></li>)}</ul> : <p className="hint">None found.</p>}</div>
      </div>
      {(pat.omitted > 0 || pat.extra > 0) && <p>You skipped {pat.omitted} word{pat.omitted === 1 ? "" : "s"} and added {pat.extra} extra.</p>}

      {events.length > 0 && (<>
        <h2>Speed and accuracy through the test</h2>
        <LineChart labels={a.timeline.map((b) => mmss(b.startSec))} series={[{ label: "Net WPM", color: "#16233b", values: a.timeline.map((b) => b.wpm) }, { label: "Accuracy %", color: "#1f7a4d", values: a.timeline.map((b) => b.accuracy) }]} yMax={100} marks={a.timeline.map((b, i) => (drops.includes(b.startSec) ? i : -1)).filter((i) => i >= 0)} />
        <p className="hint">Red bands mark stretches where accuracy dropped well below your average.</p>
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
