"use client";
import { useCallback, useEffect, useState } from "react";
import LessonDrill, { type DrillResult } from "@/components/LessonDrill";
import { ALL_LESSONS, PASS_ACCURACY, TRACKS } from "@/lib/lessons";

type Progress = Record<string, { accuracy: number; wpm: number; passed: boolean }>;

export default function Learn() {
  const [progress, setProgress] = useState<Progress>({});
  const [current, setCurrent] = useState<string | null>(null);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => { try { setProgress(JSON.parse(localStorage.getItem("tsz:learn") || "{}")); } catch {} }, []);

  const lesson = ALL_LESSONS.find((l) => l.id === current) ?? null;
  const idx = lesson ? ALL_LESSONS.indexOf(lesson) : -1;
  const unlocked = (i: number) => i === 0 || !!progress[ALL_LESSONS[i - 1].id]?.passed;

  const done = useCallback((r: DrillResult) => {
    setResult(r);
    if (!current) return;
    setProgress((p) => {
      const old = p[current];
      const next = { ...p, [current]: { accuracy: Math.max(r.accuracy, old?.accuracy ?? 0), wpm: Math.max(r.wpm, old?.wpm ?? 0), passed: !!old?.passed || r.accuracy >= PASS_ACCURACY } };
      try { localStorage.setItem("tsz:learn", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [current]);

  const start = (id: string) => { setCurrent(id); setResult(null); setRun((n) => n + 1); };

  return (
    <div className="page learn">
      <h1>Learn touch typing</h1>
      {!lesson ? (
        <>
          <p className="hint">Finish each lesson with {PASS_ACCURACY}% accuracy to unlock the next one. Progress is saved in this browser.</p>
          {TRACKS.map((t) => (
            <section key={t.id}>
              <h2>{t.title}</h2>
              <div className="lessons">
                {t.lessons.map((l) => {
                  const i = ALL_LESSONS.indexOf(l), p = progress[l.id], open = unlocked(i);
                  return (
                    <button key={l.id} disabled={!open} className={`lesson${p?.passed ? " passed" : ""}`} onClick={() => start(l.id)}>
                      <b>{l.title}</b>
                      <span>{!open ? "Locked" : p ? `Best ${p.accuracy}% · ${p.wpm} WPM${p.passed ? " · passed" : ""}` : "Not started"}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      ) : (
        <>
          <p><button className="link" onClick={() => setCurrent(null)}>Back to all lessons</button></p>
          <h2>{lesson.title}</h2>
          {!result ? (
            <LessonDrill key={`${lesson.id}-${run}`} lesson={lesson} onDone={done} />
          ) : (
            <div className="summary">
              <p><b>{result.accuracy}%</b> accuracy at <b>{result.wpm}</b> WPM.</p>
              {result.accuracy >= PASS_ACCURACY ? <p>Lesson passed.</p> : <p>You need {PASS_ACCURACY}% to move on. Slow down and look at the highlighted key.</p>}
              {result.weakKeys.length > 0 && <p>Keys to watch: {result.weakKeys.map((k) => `"${k}"`).join(", ")}.</p>}
              <button className="go" onClick={() => start(lesson.id)}>Try again</button>{" "}
              {result.accuracy >= PASS_ACCURACY && ALL_LESSONS[idx + 1] && <button className="go" onClick={() => start(ALL_LESSONS[idx + 1].id)}>Next lesson</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
