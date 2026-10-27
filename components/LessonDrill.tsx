"use client";
import { useEffect, useRef, useState } from "react";
import FingerGuide from "./FingerGuide";
import { buildDrill, type Lesson } from "@/lib/lessons";

export interface DrillResult { accuracy: number; wpm: number; weakKeys: string[] }

export default function LessonDrill({ lesson, onDone }: { lesson: Lesson; onDone: (r: DrillResult) => void }) {
  const [seq, setSeq] = useState("");
  const [i, setI] = useState(0);
  const [flash, setFlash] = useState(false);
  const stats = useRef({ ok: 0, bad: 0, start: 0, miss: {} as Record<string, number>, done: false });

  useEffect(() => { setSeq(buildDrill(lesson.keys)); }, [lesson]); // generated on the client to avoid hydration mismatch

  useEffect(() => {
    if (!seq) return;
    const onKey = (e: KeyboardEvent) => {
      if (stats.current.done || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      e.preventDefault();
      const s = stats.current, want = seq[i];
      if (!s.start) s.start = Date.now();
      if (e.key === want) {
        s.ok++;
        setFlash(false);
        if (i + 1 >= seq.length) {
          s.done = true;
          const mins = Math.max((Date.now() - s.start) / 60000, 1 / 60);
          const total = s.ok + s.bad;
          const weak = Object.entries(s.miss).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
          onDone({ accuracy: Math.round((s.ok / total) * 1000) / 10, wpm: Math.round(s.ok / 5 / mins), weakKeys: weak });
        }
        setI(i + 1);
      } else {
        s.bad++;
        s.miss[want] = (s.miss[want] ?? 0) + 1;
        setFlash(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seq, i, onDone]);

  if (!seq) return <p>Preparing drill…</p>;
  return (
    <div className="drill">
      <p className="tip">{lesson.tip}</p>
      <div className="line" lang="en" aria-label="Drill text">
        {Array.from(seq).map((c, k) => <span key={k} className={k < i ? "ok" : k === i ? (flash ? "cur bad" : "cur") : ""}>{c === " " ? "\u00a0" : c}</span>)}
      </div>
      <FingerGuide target={seq[i] ?? ""} flash={flash} />
      <p className="hint">Use a computer keyboard. Press the highlighted key. A wrong key does not move you forward.</p>
    </div>
  );
}
