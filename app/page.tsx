"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/clientApi";

type Exam = {
  slug: string;
  name: string;
  language: "en" | "hi";
  duration_sec: number;
  description?: string;
};
type DailyPassage = {
  id: string;
  title: string;
  word_count: number;
  language?: string;
  date?: string;
};

const examGroups = [
  { title: "Police & Paramilitary", description: "Prepare for ministerial and head-constable typing tests.", terms: ["Delhi Police", "BSF", "CISF", "CRPF", "SSB"] },
  { title: "Staff Selection", description: "Structured practice for SSC and staff-selection examinations.", terms: ["SSC CGL", "SSC CHSL", "DSSSB", "DDA"] },
  { title: "Railway & Courts", description: "Typing practice for railway and judicial recruitment.", terms: ["RRB NTPC", "Railway", "High Court", "District Courts"] },
];

export default function Home() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [daily, setDaily] = useState<{ en?: DailyPassage; hi?: DailyPassage }>({});
  const [loading, setLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/templates")
      .then(result => {
        if (!active) return;
        if (result.ok && Array.isArray(result.data)) setExams(result.data);
        else setError(result.data?.error || "The exam catalogue is temporarily unavailable.");
      })
      .catch(() => { if (active) setError("Unable to load the exam catalogue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Read today's live passages from the same existing library API used by the
  // Passage Library. The library page and its behaviour are deliberately untouched.
  useEffect(() => {
    let active = true;
    api("/api/library")
      .then(result => {
        if (!active) return;
        if (result.ok && result.data?.daily) setDaily(result.data.daily);
      })
      .catch(() => { /* The library remains available from its own page. */ })
      .finally(() => { if (active) setDailyLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleExams = useMemo(() => exams.slice(0, 8), [exams]);

  return (
    <>
      <section className="public-hero rkc-home-hero">
        <div className="public-hero-inner">
          <div>
            <span className="public-kicker">English & Hindi · Exam-oriented typing practice</span>
            <h1>Turn your computer into a <span>typing examination hall.</span></h1>
            <p>Choose your recruitment exam, practise with its configured typing environment, and review your performance with clear scoring and error analysis.</p>
            <div className="public-actions">
              <a className="site-button" href="/simulators">Open all exam tests <span aria-hidden="true">→</span></a>
              <a className="site-button secondary" href="/test">Start free practice</a>
            </div>
            <div className="hero-proof">
              <span><b>EN</b> English</span><i />
              <span><b>हि</b> Hindi</span><i />
              <span><b>CBT</b> Exam-style interface</span>
            </div>
          </div>
          <div className="hero-demo" aria-label="Typing test interface preview">
            <div className="hero-demo-top"><span>LIVE TYPING PRACTICE</span><span>10:00</span></div>
            <div className="hero-demo-passage">A typing skill test evaluates speed, accuracy and the ability to reproduce the given passage within the prescribed time. Candidates should follow the instructions and maintain a steady typing rhythm.</div>
            <div className="hero-demo-stats">
              <div><b>NET WPM</b><small>SCORING PROFILE</small></div>
              <div><b>ACCURACY</b><small>ERROR REVIEW</small></div>
              <div><b>LIVE</b><small>TEST TIMER</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section rkc-live-section">
        <div className="public-section-inner">
          <div className="public-section-head">
            <span className="public-kicker">Today's practice set</span>
            <h2>Live English & Hindi passages</h2>
            <p>Today's available passages are loaded from the existing TypingSkillZone passage service. Open the library to read, select or practise a passage.</p>
          </div>
          <div className="rkc-live-grid">
            {dailyLoading ? <div className="empty-state">Loading today's passages…</div> : (
              <>
                <article className="rkc-live-card">
                  <div className="rkc-live-card-head"><span className="rkc-live-language">EN</span><span>ENGLISH TYPING</span></div>
                  {daily.en ? <><h3>{daily.en.title || "Today's English passage"}</h3><p>{daily.en.word_count} words · Passage ID {daily.en.id}</p><a href="/library">Open English passage <span aria-hidden="true">→</span></a></> : <><h3>No English passage available</h3><p>Check the passage library for the latest collection.</p><a href="/library">Open Passage Library →</a></>}
                </article>
                <article className="rkc-live-card">
                  <div className="rkc-live-card-head"><span className="rkc-live-language hindi">हि</span><span>HINDI TYPING</span></div>
                  {daily.hi ? <><h3>{daily.hi.title || "आज का हिंदी अभ्यास"}</h3><p>{daily.hi.word_count} words · Passage ID {daily.hi.id}</p><a href="/library">Open Hindi passage <span aria-hidden="true">→</span></a></> : <><h3>आज का हिंदी अभ्यास उपलब्ध नहीं है</h3><p>नवीनतम संग्रह के लिए पैसेज लाइब्रेरी देखें।</p><a href="/library">पैसेज लाइब्रेरी खोलें →</a></>}
                </article>
              </>
            )}
          </div>
          <div className="public-actions" style={{ justifyContent: "center" }}>
            <a className="site-button secondary" href="/library">Browse all passages & monthly archives</a>
          </div>
        </div>
      </section>

      <section className="public-section soft">
        <div className="public-section-inner">
          <div className="public-section-head">
            <span className="public-kicker">Available typing examinations</span>
            <h2>Select your exam and start a test</h2>
            <p>Exam options below come from the live exam-template catalogue. Each simulator opens its configured duration, passage mode and scoring profile.</p>
          </div>
          {loading ? <div className="empty-state">Loading active examinations…</div> :
            error ? <div className="empty-state" role="status">{error} <a href="/simulators">Open all simulators</a>.</div> :
            <div className="exam-grid">{visibleExams.map(exam => (
              <article className="exam-card" key={exam.slug}>
                <div className="exam-card-top"><span className="exam-mark">{exam.name.slice(0, 3).toUpperCase()}</span><span className="exam-meta">{exam.language === "hi" ? "हिन्दी" : "ENGLISH"}</span></div>
                <h3>{exam.name}</h3>
                <p>{exam.description || "Open the configured examination profile to review its typing practice."}</p>
                <a href={`/simulators/${exam.slug}`}>Open exam test <span aria-hidden="true">→</span></a>
              </article>
            ))}</div>}
          <div className="public-actions" style={{ justifyContent: "center" }}><a className="site-button" href="/simulators">View all available tests</a></div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner">
          <div className="public-section-head">
            <span className="public-kicker">Explore by exam category</span>
            <h2>Find the right typing test</h2>
            <p>Browse the exam catalogue by recruitment family, then open the exact language and test profile available.</p>
          </div>
          <div className="why-grid">{examGroups.map(group => (
            <article className="why-card" key={group.title}>
              <h3>{group.title}</h3><p>{group.description}</p><div className="rkc-category-terms">{group.terms.map(term => <span key={term}>{term}</span>)}</div>
              <a href="/exams">Browse exam catalogue →</a>
            </article>
          ))}</div>
        </div>
      </section>

      <section className="public-section soft">
        <div className="public-section-inner">
          <div className="public-section-head"><span className="public-kicker">Your preparation workspace</span><h2>Practise, evaluate and improve</h2><p>Use the dedicated tools for each stage of your typing preparation.</p></div>
          <div className="quick-actions">
            <a className="qa-card" href="/library">▤<strong>Passage Library</strong><span>Daily passages and monthly archives</span></a>
            <a className="qa-card" href="/test">⌨<strong>Free Practice</strong><span>Start a timed typing session</span></a>
            <a className="qa-card" href="/dashboard">◷<strong>My Results</strong><span>Review saved attempts and progress</span></a>
            <a className="qa-card" href="/exam-results">✓<strong>Evaluation Guide</strong><span>Understand result calculations</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
