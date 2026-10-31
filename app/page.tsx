"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/clientApi";

type Exam = { slug: string; name: string; language: "en" | "hi"; duration_sec: number; description?: string };

export default function Home() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/templates")
      .then(result => {
        if (!active) return;
        if (result.ok && Array.isArray(result.data)) setExams(result.data);
        else setError(result.data?.error || "Exam catalogue is temporarily unavailable.");
      })
      .catch(() => { if (active) setError("Unable to load the exam catalogue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleExams = useMemo(() => exams.slice(0, 6), [exams]);

  return (
    <div className="home-reference">
      <section className="home-reference-hero">
        <div className="home-reference-inner">
          <div className="home-reference-copy">
            <span className="home-reference-kicker"><i /> A focused workspace for competitive typing exams</span>
            <h1>Train like it’s the <span>real examination.</span></h1>
            <p>Prepare in English and Hindi with exam-specific typing environments, structured passage collections and transparent performance evaluation.</p>
            <div className="home-reference-actions">
              <a className="home-reference-primary" href="/exams">Explore examinations <span aria-hidden="true">→</span></a>
              <a className="home-reference-secondary" href="/test">Start free practice</a>
            </div>
            <div className="home-reference-proof" aria-label="Platform features">
              <span><b>EN</b> English typing</span><i />
              <span><b>हि</b> Hindi typing</span><i />
              <span><b>CBT</b> Exam-style practice</span>
            </div>
          </div>
          <div className="home-reference-preview" aria-label="Typing simulator preview">
            <div className="home-reference-preview-head">
              <span><i /> SIMULATOR PREVIEW</span><b>10:00</b>
            </div>
            <div className="home-reference-passage">
              A typing skill test measures speed, accuracy and the ability to reproduce a given passage within a fixed duration. Candidates should maintain a steady rhythm and follow the instructions of the selected examination.
            </div>
            <div className="home-reference-metrics">
              <div><strong>NET WPM</strong><span>SCORING PROFILE</span></div>
              <div><strong>ACCURACY</strong><span>ERROR REVIEW</span></div>
              <div><strong>LIVE</strong><span>TEST TIMER</span></div>
            </div>
          </div>
        </div>
      </section>
      <section className="home-reference-benefits" aria-label="Platform benefits">
        <div><span>01</span><p><strong>Exam-specific simulators</strong><small>Rules and scoring configured for each examination.</small></p></div>
        <div><span>02</span><p><strong>English & Hindi typing</strong><small>Practice in the language required by your exam.</small></p></div>
        <div><span>03</span><p><strong>Performance analysis</strong><small>Review net speed, accuracy and typing errors.</small></p></div>
      </section>
      <section className="home-reference-exams">
        <div className="home-reference-section-head">
          <div><span className="home-reference-label">START PREPARING</span><h2>Choose your examination</h2><p>Open an exam profile and practise with its configured pattern.</p></div>
          <a href="/exams">View all examinations <span aria-hidden="true">→</span></a>
        </div>
        {loading ? <div className="home-reference-state">Loading active examinations…</div> :
          error ? <div className="home-reference-state" role="status">{error} <a href="/exams">Open the exam catalogue</a>.</div> :
          <div className="home-reference-exam-grid">{visibleExams.map(exam => (
            <a className="home-reference-exam-card" href={"/simulators/" + exam.slug} key={exam.slug}>
              <span className="home-reference-exam-mark">{exam.name.slice(0, 3).toUpperCase()}</span>
              <span className="home-reference-exam-copy"><strong>{exam.name}</strong><small>{exam.language === "hi" ? "Hindi typing" : "English typing"} · {Math.max(1, Math.round(exam.duration_sec / 60))} min</small></span>
              <span className="home-reference-exam-arrow" aria-hidden="true">→</span>
            </a>
          ))}</div>}
      </section>
      <section className="home-reference-library">
        <div><span className="home-reference-label">YOUR DAILY WORKSPACE</span><h2>Passages, practice and results — connected.</h2><p>Continue from the passage library, start a timed practice session or review your saved attempts.</p></div>
        <div className="home-reference-library-actions"><a href="/library">Passage Library</a><a href="/dashboard">Exam Results</a></div>
      </section>
    </div>
  );
}
