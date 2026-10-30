"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/clientApi";

type Exam = { slug: string; name: string; language: "en" | "hi"; duration_sec: number; description?: string };
const examGroups = [
  { title: "Police & Paramilitary", terms: ["Delhi Police", "BSF", "CISF", "CRPF", "SSB"] },
  { title: "Staff Selection", terms: ["SSC CGL", "SSC CHSL", "DSSSB"] },
  { title: "Railway & Courts", terms: ["RRB", "Railway", "Court", "High Court"] },
];

export default function Home() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/templates").then(result => {
      if (!active) return;
      if (result.ok && Array.isArray(result.data)) setExams(result.data);
      else setError(result.data?.error || "Exam catalogue is temporarily unavailable.");
    }).catch(() => { if (active) setError("Unable to load the exam catalogue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const visibleExams = useMemo(() => exams.slice(0, 8), [exams]);

  return <>
    <section className="public-hero">
      <div className="public-hero-inner">
        <div>
          <span className="public-kicker">A focused workspace for competitive typing exams</span>
          <h1>Train like it’s the <span>real examination.</span></h1>
          <p>Prepare in English and Hindi with exam-specific typing environments, structured passage collections and transparent performance evaluation.</p>
          <div className="public-actions">
            <a className="site-button" href="/exams">Explore examinations <span aria-hidden="true">→</span></a>
            <a className="site-button secondary" href="/test">Start free practice</a>
          </div>
          <div className="hero-proof">
            <span><b>EN</b> English typing</span><i />
            <span><b>हि</b> Hindi typing</span><i />
            <span><b>CBT</b> Exam-style practice</span>
          </div>
        </div>
        <div className="hero-demo" aria-label="Typing test interface preview">
          <div className="hero-demo-top"><span>SIMULATOR PREVIEW</span><span>10:00</span></div>
          <div className="hero-demo-passage">A typing skill test measures speed, accuracy and the ability to reproduce a given passage within a fixed duration. Candidates should maintain a steady rhythm and follow the instructions of the selected examination.</div>
          <div className="hero-demo-stats">
            <div><b>NET WPM</b><small>SCORING PROFILE</small></div>
            <div><b>ACCURACY</b><small>ERROR REVIEW</small></div>
            <div><b>LIVE</b><small>TEST TIMER</small></div>
          </div>
        </div>
      </div>
    </section>

    <section className="public-section">
      <div className="public-section-inner">
        <div className="public-section-head"><span className="public-kicker">Your preparation workspace</span><h2>Everything in one organised platform</h2><p>Move from selecting an exam to practising, reviewing and improving without losing your place.</p></div>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon">01</div><h3>Exam-specific simulators</h3><p>Configured duration, passage display, correction policy and scoring for each available examination.</p></article>
          <article className="feature-card"><div className="feature-icon">02</div><h3>Structured passage library</h3><p>Browse daily passages, monthly archives and English or Hindi collections with searchable passage IDs.</p></article>
          <article className="feature-card"><div className="feature-icon">03</div><h3>Performance review</h3><p>Use saved attempts, net speed, accuracy and error breakdowns to identify the next improvement target.</p></article>
        </div>
      </div>
    </section>

    <section className="public-section soft">
      <div className="public-section-inner">
        <div className="public-section-head"><span className="public-kicker">Exam catalogue</span><h2>Choose your examination</h2><p>Only active exam templates returned by the existing catalogue API are shown here.</p></div>
        {loading ? <div className="empty-state">Loading active examinations…</div> :
          error ? <div className="empty-state" role="status">{error} <a href="/exams">Open the exam catalogue</a>.</div> :
          <div className="exam-grid">{visibleExams.map(exam => (
            <article className="exam-card" key={exam.slug}>
              <div className="exam-card-top"><span className="exam-mark">{exam.name.slice(0, 3).toUpperCase()}</span><span className="exam-meta">{exam.language === "hi" ? "हिन्दी" : "ENGLISH"}</span></div>
              <h3>{exam.name}</h3>
              <p>{exam.description || "Open the configured examination profile to review its typing practice."}</p>
              <a href={`/simulators/${exam.slug}`}>Open simulator <span aria-hidden="true">→</span></a>
            </article>
          ))}</div>}
        <div className="public-actions" style={{ justifyContent: "center" }}><a className="site-button secondary" href="/exams">View all examinations</a></div>
      </div>
    </section>

    <section className="public-section">
      <div className="public-section-inner">
        <div className="public-section-head"><span className="public-kicker">Go directly to work</span><h2>Quick access</h2><p>Continue with the part of your preparation that matters today.</p></div>
        <div className="quick-actions">
          <a className="qa-card" href="/library">▤<strong>Passage Library</strong><span>Daily & monthly passages</span></a>
          <a className="qa-card" href="/test">⌨<strong>Free Practice</strong><span>Start a timed session</span></a>
          <a className="qa-card" href="/simulators">◫<strong>Exam Simulators</strong><span>Choose exact exam rules</span></a>
          <a className="qa-card" href="/dashboard">◷<strong>My Results</strong><span>Review saved attempts</span></a>
        </div>
      </div>
    </section>

    <section className="public-section soft">
      <div className="public-section-inner">
        <div className="public-section-head"><span className="public-kicker">Find your exam family</span><h2>Preparation paths</h2><p>Use the catalogue search to locate a specific exam and language.</p></div>
        <div className="why-grid">{examGroups.map(group => <article className="why-card" key={group.title}><h3>{group.title}</h3><p>{group.terms.join(" · ")}</p><a href="/exams">Browse available profiles →</a></article>)}</div>
      </div>
    </section>
  </>;
}
