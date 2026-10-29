"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";

interface Simulator {
  slug: string; name: string; language: "en" | "hi"; duration_sec: number;
  display_mode: string; backspace: string; scoring: any; description?: string;
  participants?: number; my_best?: number | string | null;
}
const examMark = (slug: string) => {
  if (slug.includes("ssc-chsl")) return { mark: "SSC", tone: "violet", family: "Staff Selection Commission", short: "CHSL" };
  if (slug.includes("ssc-cgl")) return { mark: "SSC", tone: "blue", family: "Staff Selection Commission", short: "CGL" };
  if (slug.includes("ssc")) return { mark: "SSC", tone: "violet", family: "Staff Selection Commission", short: "SSC" };
  if (slug.includes("rrb") || slug.includes("railway")) return { mark: "RRB", tone: "orange", family: "Railway Recruitment Board", short: "RRB" };
  if (slug.includes("delhi-police") || slug.includes("dp-hcm")) return { mark: "DP", tone: "red", family: "Delhi Police", short: "HCM" };
  if (slug.includes("court") || slug.includes("high-court")) return { mark: "HC", tone: "teal", family: "Court Recruitment", short: "COURT" };
  if (slug.includes("bsf")) return { mark: "BSF", tone: "green", family: "Border Security Force", short: "HCM" };
  if (slug.includes("cisf")) return { mark: "CISF", tone: "blue", family: "Central Industrial Security Force", short: "HCM" };
  if (slug.includes("crpf")) return { mark: "CRPF", tone: "red", family: "Central Reserve Police Force", short: "HCM" };
  if (slug.includes("dsssb")) return { mark: "DSSSB", tone: "violet", family: "Delhi Subordinate Services Selection Board", short: "LDC" };
  return { mark: "TSZ", tone: "blue", family: "TypingSkillZone practice", short: "PRACTICE" };
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
      <section className="simulators-hero sim-v2-hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR EXAM · YOUR RULES</div>
        <h1>Find your exam simulator</h1>
        <p>Choose a dedicated typing environment, review its configured timing and scoring, then practise against a passage library designed for focused exam preparation.</p>
        <div className="cta-group"><a href="/test" className="go hero-primary">Start free practice <span>→</span></a><a href="/library" className="go hero-secondary">Browse passage library</a></div>
      <div className="sim-hero-stats"><span><strong>{sims.length}</strong> exam options</span><span><strong>EN + हिन्दी</strong> language practice</span><span><strong>Live scoring</strong> and results</span></div>
      </section>
      <div className="sim-filter-bar sim-filter-v2">
        <label>Language <select value={filter} onChange={e => setFilter(e.target.value as "en" | "hi" | "all")}><option value="all">All languages</option><option value="en">English</option><option value="hi">हिंदी</option></select></label>
        {!loading && !error && <span className="sim-count">Showing {filtered.length} exam option{filtered.length === 1 ? "" : "s"}</span>}
      </div>
      {usingFallback && !loading && <div className="data-source-notice" role="status"><strong>Temporary catalogue mode</strong><p>The built-in exam presets are available for practice, but database-backed exam configuration and saved result history are unavailable. The database connection/schema needs repair.</p></div>}
      {loading ? <div className="exam-loading"><span className="loading-pulse" /> Loading exam options…</div> :
        error ? <div className="empty-state"><b>Exam options couldn't be loaded.</b><p>{error}</p><button className="go alt" onClick={() => {setLoading(true);setError("");api("/api/simulators").then(r=>{if(r.ok&&Array.isArray(r.data))setSims(r.data);else setError(r.data?.error??"Unable to load exams.");}).catch(()=>setError("Connection issue. Please try again.")).finally(()=>setLoading(false));}}>Try again</button></div> :
        !filtered.length ? <div className="empty-state"><b>No exams match this language.</b><p>Choose another language to see more exam options.</p><button className="go alt" onClick={() => setFilter("all")}>Show all exams</button></div> :
        <div className="sim-page-grid sim-page-grid-v2">{filtered.map(sim => {
          const mark = examMark(sim.slug);
          const target = sim.scoring?.qualifyingWpm;
          return <a key={sim.slug} className={`sim-page-card sim-page-card-v2 home-style-exam-card ${mark.tone}`} href={`/simulators/${sim.slug}`}>
            <ExamEmblem slug={sim.slug} mark={mark.mark} short={mark.short} family={mark.family} tone={mark.tone} />
            <div className="home-style-exam-content">
              <div className="home-style-exam-top"><span className="exam-family">{mark.family}</span><span className="exam-arrow" aria-hidden="true">↗</span></div>
              <span className="sim-notice-pill">Configured exam pattern</span>
              <h2>{sim.name}</h2>
              <p className="sim-card-description">{sim.description || "A dedicated typing environment with configured timing, display and scoring settings."}</p>
              <div className="home-style-exam-meta"><span>{sim.language === "hi" ? "हिंदी" : "English"}</span><i /> <span>{Math.max(1, Math.round(sim.duration_sec / 60))} min</span><i /> <span>{bsLabel(sim.backspace)}</span></div>
              <div className="exam-target"><span>{target ? "Configured target · verify official rules" : "Practice mode"}</span><b>{target ? <>{target} <small>net WPM</small></> : sim.scoring?.unit === "keystrokes" ? "Key depressions" : "Build skills"}</b></div>
              <div className="home-style-exam-footer"><span>Open dedicated simulator</span><span>→</span><small>Exam pattern configured for practice</small></div>
            </div>
          </a>;
        })}</div>}
      <div className="sim-official-note"><strong>Official rule reminder</strong><p>Cards display the current configured practice profile. Verify qualifying speed, duration, error rules, keyboard/layout requirements and test procedure against the latest recruitment notification. The category marks are not official government seals.</p></div>
      <p className="home-disclaimer">Official emblems identify the recruiting body where a verified asset is available. TypingSkillZone is an independent practice platform; confirm qualifying rules against the latest official notification.</p>
    </div>
  );
}