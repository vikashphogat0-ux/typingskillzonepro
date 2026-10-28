"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/clientApi";

interface Simulator {
  slug: string; name: string; language: "en" | "hi"; duration_sec: number;
  display_mode: string; backspace: string; scoring: any; description?: string;
  participants?: number; my_best?: number | string | null;
}
const examMark = (slug: string) => {
  if (slug.includes("ssc-chsl")) return { mark: "SSC", tone: "violet", family: "Staff Selection Commission" };
  if (slug.includes("ssc-cgl")) return { mark: "CGL", tone: "blue", family: "Combined Graduate Level" };
  if (slug.includes("rrb") || slug.includes("railway")) return { mark: "RRB", tone: "orange", family: "Railway Recruitment" };
  if (slug.includes("delhi-police")) return { mark: "DP", tone: "red", family: "Delhi Police" };
  if (slug.includes("court")) return { mark: "HC", tone: "teal", family: "Court Typing" };
  if (slug.includes("bsf")) return { mark: "BSF", tone: "green", family: "Border Security Force" };
  return { mark: "TSZ", tone: "blue", family: "Typing practice" };
};
const modeLabel = (mode: string) => mode === "highlighted" ? "Live character feedback" : mode === "unhighlighted" ? "Classic passage view" : "Paper-to-screen";
const bsLabel = (bs: string) => bs === "full" ? "Backspace allowed" : bs === "word" ? "Current word only" : "Backspace disabled";

export default function SimulatorsPage() {
  const [sims, setSims] = useState<Simulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"en" | "hi" | "all">("all");
  useEffect(() => {
    let active = true;
    api("/api/simulators").then(r => {
      if (!active) return;
      if (r.ok && Array.isArray(r.data)) setSims(r.data);
      else setError(r.data?.error ?? "We couldn't load exam options.");
    }).catch(() => { if (active) setError("Connection issue. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const usingFallback = sims.some(s => s.description?.includes("Temporary local fallback"));
  const filtered = useMemo(() => filter === "all" ? sims : sims.filter(s => s.language === filter), [filter, sims]);
  return (
    <div className="page">
      <section className="simulators-hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> FIND YOUR EXAM</div>
        <h1>Explore exam options</h1>
        <p>Choose your target exam, review its configured pattern, and enter a dedicated practice environment with its own leaderboard. Exam rules and qualifying criteria should always be checked against the official notification.</p>
        <div className="cta-group"><a href="/test" className="go hero-primary">Try free practice <span>→</span></a><a href="/library" className="go hero-secondary">Browse passage library</a></div>
      </section>
      <div className="sim-filter-bar">
        <label>Choose language <select value={filter} onChange={e => setFilter(e.target.value as "en" | "hi" | "all")}><option value="all">All languages</option><option value="en">English</option><option value="hi">हिंदी</option></select></label>
        {!loading && !error && <span className="sim-count">Showing {filtered.length} exam option{filtered.length === 1 ? "" : "s"}</span>}
      </div>
      {usingFallback && !loading && <div className="data-source-notice" role="status"><strong>Temporary catalogue mode</strong><p>The built-in exam presets are available for practice, but database-backed exam configuration and saved result history are unavailable. The database connection/schema needs repair.</p></div>}
      {loading ? <div className="exam-loading"><span className="loading-pulse" /> Loading exam options…</div> :
        error ? <div className="empty-state"><b>Exam options couldn't be loaded.</b><p>{error}</p><button className="go alt" onClick={() => {setLoading(true);setError("");api("/api/simulators").then(r=>{if(r.ok&&Array.isArray(r.data))setSims(r.data);else setError(r.data?.error??"Unable to load exams.");}).catch(()=>setError("Connection issue. Please try again.")).finally(()=>setLoading(false));}}>Try again</button></div> :
        !filtered.length ? <div className="empty-state"><b>No exams match this language.</b><p>Choose another language to see more exam options.</p><button className="go alt" onClick={() => setFilter("all")}>Show all exams</button></div> :
        <div className="sim-page-grid">{filtered.map(sim => {
          const mark = examMark(sim.slug);
          return <a key={sim.slug} className="sim-page-card" href={`/simulators/${sim.slug}`}>
            <div className={`exam-emblem ${mark.tone}`}><span>{mark.mark}</span><small>EXAM PREP</small></div>
            <div>
              <div className="exam-card-top"><span className="exam-family">{mark.family}</span><span className="exam-arrow">↗</span></div>
              <h2>{sim.name}</h2>
              <p>{sim.description || "A dedicated typing practice environment with exam-configured timing, display and scoring settings."}</p>
              <div className="sim-page-tags"><span>{sim.language === "hi" ? "हिंदी" : "English"}</span><span>{Math.max(1, Math.round(sim.duration_sec / 60))} minutes</span><span>{bsLabel(sim.backspace)}</span></div>
              {sim.scoring?.qualifyingWpm ? <p><strong>Configured target: {sim.scoring.qualifyingWpm} net WPM</strong></p> : <p>Practice and improve your baseline</p>}
              <div className="sim-page-bottom"><span>Explore this exam <b>→</b></span><small>{sim.participants ?? 0} ranked participant{sim.participants === 1 ? "" : "s"}</small></div>
            </div>
          </a>;
        })}</div>}
      <p className="home-disclaimer">Exam marks are TypingSkillZone navigation artwork, not official government or recruitment-body logos. Confirm all qualifying rules from the current official notification.</p>
    </div>
  );
}