"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";

interface ExamCard {
  slug: string; name: string; language: "en" | "hi"; duration_sec: number;
  display_mode: string; backspace: string; scoring: any; description?: string; participants?: number;
}
const examMark = (slug: string) => {
  if (slug.includes("ssc-chsl")) return { mark: "SSC", tone: "violet", family: "Staff Selection Commission", short: "CHSL" };
  if (slug.includes("ssc-cgl")) return { mark: "SSC", tone: "blue", family: "Staff Selection Commission", short: "CGL" };
  if (slug.includes("rrb") || slug.includes("railway")) return { mark: "RRB", tone: "orange", family: "Railway Recruitment Board", short: "RRB" };
  if (slug.includes("delhi-police") || slug.includes("dp-hcm")) return { mark: "DP", tone: "red", family: "Delhi Police", short: "HCM" };
  if (slug.includes("court")) return { mark: "HC", tone: "teal", family: "Court Recruitment", short: "COURT" };
  if (slug.includes("bsf")) return { mark: "BSF", tone: "green", family: "Border Security Force", short: "HCM" };
  if (slug.includes("cisf")) return { mark: "CISF", tone: "blue", family: "Central Industrial Security Force", short: "HCM" };
  if (slug.includes("crpf")) return { mark: "CRPF", tone: "red", family: "Central Reserve Police Force", short: "HCM" };
  if (slug.includes("dsssb")) return { mark: "DSSSB", tone: "violet", family: "Delhi Subordinate Services Selection Board", short: "LDC" };
  return { mark: "TSZ", tone: "blue", family: "TypingSkillZone practice", short: "PRACTICE" };
};
export default function Home() {
  const [exams, setExams] = useState<ExamCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/templates").then(r => {
      if (!active) return;
      if (r.ok && Array.isArray(r.data)) setExams(r.data);
      else setLoadError(r.data?.error ?? "We couldn't load exam options right now.");
    }).catch(() => { if (active) setLoadError("Connection issue. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const featuredPriority = ["dp-hcm-en", "dp-hcm-hi", "bsf-hcm-en", "bsf-hcm-hi", "ssc-chsl-en", "ssc-chsl-hi", "ssc-cgl-en", "ssc-cgl-hi"];
  const featured = [...exams].sort((a, b) => {
    const ai = featuredPriority.indexOf(a.slug), bi = featuredPriority.indexOf(b.slug);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.name.localeCompare(b.name);
  }).slice(0, 8);
  return (
    <div className="home home-v2">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT EXAM STARTS HERE</div>
          <h1>Type faster.<br /><span>Score higher.</span></h1>
          <p className="hero-lede">Focused typing practice for India’s competitive exams. Build speed, sharpen accuracy, and prepare with exam-specific test patterns.</p>
          <div className="cta-group">
            <a href="/simulators" className="go hero-primary">Explore Exam Options <span aria-hidden="true">↗</span></a>
            <a href="/test" className="go alt hero-secondary">Try Free Practice</a>
          </div>
          <div className="hero-proof">
            <span><b>EN</b> English typing</span><i />
            <span><b>हि</b> Hindi typing</span><i />
            <span><b>↗</b> Progress tracking</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Typing practice illustration">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-glow" />
          <div className="hero-stat stat-speed"><span className="stat-icon">↗</span><div><small>BUILD YOUR PACE</small><strong>One word at a time</strong></div></div>
          <div className="keyboard-card">
            <div className="keyboard-top"><span /><span /><span /><label>TSZ · PRACTICE MODE</label></div>
            <div className="keyboard-screen"><span>the quick brown</span><b> fox jumps over</b><span> the lazy dog_</span></div>
            <div className="key-row">{["Q","W","E","R","T","Y","U","I","O","P"].map((k,i)=><span key={k} className={i===3||i===6?"key-active":""}>{k}</span>)}</div>
            <div className="key-row offset">{["A","S","D","F","G","H","J","K","L"].map((k,i)=><span key={k} className={i===3?"key-active":""}>{k}</span>)}</div>
            <div className="key-row lower">{["Z","X","C","V","B","N","M","⌫"].map((k,i)=><span key={k} className={i===3?"key-active":""}>{k}</span>)}</div>
            <div className="space-key" />
          </div>
          <div className="hero-stat stat-focus"><span className="focus-mark">✦</span><div><small>YOUR FOCUS</small><strong>Accuracy first. Speed follows.</strong></div></div>
        </div>
      </section>

      <section className="home-benefits">
        <div><span className="benefit-icon">◎</span><div><b>Exam-focused practice</b><p>Practice patterns built around each exam’s configured rules.</p></div></div>
        <div><span className="benefit-icon">↗</span><div><b>Meaningful progress</b><p>Understand your speed, accuracy and mistakes over time.</p></div></div>
        <div><span className="benefit-icon">▤</span><div><b>Passage library</b><p>Find English and Hindi passages for focused daily practice.</p></div></div>
      </section>

      <section className="home-exams">
        <div className="section-heading">
          <div><div className="eyebrow">FIND YOUR TRACK</div><h2>Explore exam options</h2><p>Choose the exam you’re preparing for and practise in a dedicated space.</p></div>
          <a className="text-link" href="/simulators">View all exams <span>→</span></a>
        </div>
        {loading ? <div className="exam-loading"><span className="loading-pulse" /> Loading exam options…</div> :
          loadError ? <div className="empty-state"><b>Exam options are temporarily unavailable.</b><p>{loadError}</p><button className="go alt" onClick={() => { setLoading(true); setLoadError(""); api("/api/templates").then(r => { if (r.ok && Array.isArray(r.data)) setExams(r.data); else setLoadError(r.data?.error ?? "Unable to load exams."); }).catch(() => setLoadError("Connection issue. Please try again.")).finally(() => setLoading(false)); }}>Try again</button></div> :
          !featured.length ? <div className="empty-state"><b>New exam options are on the way.</b><p>Try a free practice test while the exam catalogue is being prepared.</p><a href="/test" className="go alt">Start free practice</a></div> :
          <div className="home-exam-grid">{featured.map(exam => {
            const mark = examMark(exam.slug);
            return <a key={exam.slug} className="home-exam-card" href={`/simulators/${exam.slug}`}>
              <ExamEmblem slug={exam.slug} mark={mark.mark} short={mark.short ?? "EXAM"} family={mark.family} tone={mark.tone} />
              <div className="exam-card-content"><div className="exam-card-top"><span className="exam-family">{mark.family}</span><span className="exam-arrow">↗</span></div>
                <h3>{exam.name}</h3><div className="exam-card-meta"><span>{exam.language === "hi" ? "हिंदी" : "English"}</span><i /> <span>{Math.max(1, Math.round(exam.duration_sec / 60))} min</span></div>
                {exam.scoring?.qualifyingWpm ? <div className="exam-target"><span>Configured target</span><b>{exam.scoring.qualifyingWpm} <small>WPM</small></b></div> : <div className="exam-target"><span>Practice mode</span><b>Build skills</b></div>}
                <div className="exam-card-footer"><span>View exam details</span><span aria-hidden="true">→</span></div>
              </div>
            </a>;
          })}</div>}
      </section>

      <section className="home-library-cta"><div className="library-symbol">▤</div><div><div className="eyebrow">YOUR DAILY PRACTICE ROUTINE</div><h2>Make every minute count.</h2><p>Browse the passage library, choose your language, and build a steady habit before exam day.</p></div><a href="/library" className="go hero-primary">Explore Passage Library <span>↗</span></a></section>
      <section className="home-bottom-cta"><div><div className="eyebrow">SMALL PRACTICE. REAL PROGRESS.</div><h2>Your next personal best starts with one test.</h2><p>Start free, find your baseline, and keep improving one session at a time.</p></div><a href="/test" className="go hero-primary">Start a Free Test <span>→</span></a></section>
      <p className="home-disclaimer">TypingSkillZone is an independent exam-preparation platform. Always verify qualifying criteria with the relevant official notification.</p>
    </div>
  );
}
