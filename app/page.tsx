"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { api, fmtDate } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";

type ResultRow = { id: string; created_at: string; net_wpm: string | number; accuracy: string | number; simulator: string | null };
type Exam = { slug: string; name: string; language: "en" | "hi"; duration_sec: number; scoring?: { targetWpm?: number; target_wpm?: number; minWpm?: number; [key: string]: unknown }; description?: string; backspace?: string; display_mode?: string };
type Passage = { id: string; passage_number?: number; title: string; language: string; word_count: number; date?: string; exam?: string | null };
type LibraryData = { daily?: Record<string, Passage>; list?: Passage[]; notice?: string };
const markFor = (slug: string) => {
  if (slug.includes("bsf")) return { mark: "BSF", short: "HCM", family: "Border Security Force", tone: "green" };
  if (slug.includes("cisf")) return { mark: "CISF", short: "HCM", family: "Central Industrial Security Force", tone: "blue" };
  if (slug.includes("crpf")) return { mark: "CRPF", short: "HCM", family: "Central Reserve Police Force", tone: "red" };
  if (slug.includes("delhi-police") || slug.includes("dp-hcm")) return { mark: "DP", short: "HCM", family: "Delhi Police", tone: "red" };
  if (slug.includes("dsssb")) return { mark: "DSSSB", short: "LDC", family: "Delhi Subordinate Services Selection Board", tone: "violet" };
  if (slug.includes("ssc-chsl")) return { mark: "SSC", short: "CHSL", family: "Staff Selection Commission", tone: "violet" };
  if (slug.includes("ssc-cgl")) return { mark: "SSC", short: "CGL", family: "Staff Selection Commission", tone: "blue" };
  if (slug.includes("rrb") || slug.includes("railway")) return { mark: "RRB", short: "RRB", family: "Railway Recruitment Board", tone: "orange" };
  return { mark: "TSZ", short: "PRACTICE", family: "Typing practice", tone: "blue" };
};
const targetFor = (exam: Exam) => {
  const s = exam.scoring ?? {};
  const value = s.targetWpm ?? s.target_wpm ?? s.minWpm;
  return typeof value === "number" ? value : null;
};
const dateKey = (value: string) => new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function MiniLine({ values }: { values: number[] }) {
  const clean = values.length > 1 ? values : [0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...clean), min = Math.min(0, ...clean), range = max - min || 1;
  const points = clean.map((v, i) => `${12 + i * (176 / Math.max(1, clean.length - 1))},${56 - ((v - min) / range) * 42}`).join(" ");
  return <svg className="dash-sparkline" viewBox="0 0 200 64" role="img" aria-label="Recent practice trend"><defs><linearGradient id="dash-line-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#38d9f5" stopOpacity=".28"/><stop offset="100%" stopColor="#38d9f5" stopOpacity="0"/></linearGradient></defs><polygon points={`12,62 ${points} 188,62`} fill="url(#dash-line-fill)"/><polyline points={points} fill="none" stroke="#38d9f5" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>{clean.map((v,i)=><circle key={i} cx={12 + i * (176 / Math.max(1,clean.length-1))} cy={56 - ((v-min)/range)*42} r="2.5" fill="#a5f3fc"/>)}</svg>;
}

export default function Home() {
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<"all" | "en" | "hi">("all");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all([api("/api/results"), api("/api/templates"), api("/api/library")]).then(([r,e,p]) => {
      if (!live) return;
      if (r.ok && Array.isArray(r.data)) setResults(r.data as ResultRow[]);
      else if (r.status === 401) { setSignedOut(true); setResults([]); }
      else { setResults([]); setError("Your results are temporarily unavailable."); }
      if (e.ok && Array.isArray(e.data)) setExams(e.data as Exam[]);
      if (p.ok && p.data) setLibrary(p.data as LibraryData);
    }).catch(() => { if (live) { setResults([]); setError("Some dashboard data could not be loaded. You can still start a practice test."); } });
    return () => { live = false; };
  }, []);
  const sortedExams = useMemo(() => {
    const priority = ["dp-hcm-en","dp-hcm-hi","bsf-hcm-en","bsf-hcm-hi","cisf-hcm-en","crpf-hcm-en","dsssb-ldc-en","ssc-chsl-en"];
    return [...exams].sort((a,b) => {
      const ai=priority.indexOf(a.slug), bi=priority.indexOf(b.slug);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.name.localeCompare(b.name);
    }).slice(0,6);
  }, [exams]);
  const filteredPassages = useMemo(() => {
    const rows = Object.values(library?.daily ?? {});
    const fallback = library?.list?.slice(0,4) ?? [];
    const unique = (rows.length ? rows : fallback).filter((p,i,a) => a.findIndex(x => x.id === p.id) === i);
    return unique.filter(p => (language === "all" || p.language === language) && (!search || p.title.toLowerCase().includes(search.toLowerCase()) || String(p.passage_number ?? "").padStart(2,"0").includes(search) || p.id.toLowerCase().includes(search.toLowerCase()))).slice(0,4);
  }, [library, language, search]);
  const averageSpeed = results?.length ? results.reduce((n,r)=>n+Number(r.net_wpm||0),0)/results.length : null;
  const averageAccuracy = results?.length ? results.reduce((n,r)=>n+Number(r.accuracy||0),0)/results.length : null;
  const bestSpeed = results?.length ? Math.max(...results.map(r=>Number(r.net_wpm||0))) : null;
  const trend = [...(results ?? [])].slice(0,7).reverse().map(r=>Number(r.net_wpm||0));
  const streak = useMemo(() => {
    const days = new Set((results ?? []).map(r => dateKey(r.created_at)));
    let count = 0, day = new Date();
    day = new Date(new Date().toLocaleString("en-US", {timeZone:"Asia/Kolkata"}));
    if (!days.has(dateKey(day.toISOString()))) day.setDate(day.getDate()-1);
    while (days.has(dateKey(day.toISOString())) && count < 365) { count++; day.setDate(day.getDate()-1); }
    return count;
  }, [results]);
  const fmt = (n: number | null, suffix = "") => n === null || !Number.isFinite(n) ? "—" : `${Number(n.toFixed(1))}${suffix}`;
  const passageId = (p: Passage) => String(p.passage_number ?? 1).padStart(2,"0");
  const navTo = (href: string) => { window.location.href = href; };
  return <div className="page dash-home">
    <section className="dash-welcome">
      <div className="dash-welcome-copy">
        <span className="dash-eyebrow"><i /> YOUR PERSONAL LEARNING SPACE</span>
        <h1>Welcome back<span className="dash-name">, Vikash Phogat</span> <span aria-hidden="true">👋</span></h1>
        <p>Small, focused sessions build the speed and accuracy that make exam day feel familiar.</p>
        <div className="dash-welcome-points"><span><b>01</b> Practice consistently</span><span><b>02</b> Improve daily</span><span><b>03</b> Reach your goal</span></div>
        <div className="dash-hero-actions"><a className="dash-primary-btn" href="/test">Start a practice test <span>↗</span></a><a className="dash-secondary-btn" href="/simulators">Explore exams</a></div>
      </div>
      <div className="dash-quote-panel"><div className="dash-quote-orbit" aria-hidden="true"><span>⌨</span></div><span className="dash-quote-label">A DAILY REMINDER</span><blockquote>“Discipline today creates results tomorrow.”</blockquote><div className="dash-quote-footer"><span className="dash-quote-dot" /> One session at a time</div></div>
    </section>

    <div className="dash-section-heading"><div><span className="dash-eyebrow">YOUR MOMENTUM</span><h2>Progress at a glance</h2></div><a href="/dashboard">Full analytics <span>↗</span></a></div>
    <section className="dash-metric-grid" aria-label="Practice statistics">
      <article className="dash-metric"><span className="dash-metric-icon flame">♨</span><span className="dash-metric-label">Practice streak</span><strong>{results === null ? "…" : streak}</strong><small>consecutive practice days</small><div className="dash-metric-foot"><span className="dash-positive">●</span> Keep your rhythm</div></article>
      <article className="dash-metric"><span className="dash-metric-icon cyan">▤</span><span className="dash-metric-label">Recent results</span><strong>{results === null ? "…" : results.length}</strong><small>latest saved attempts</small><div className="dash-metric-foot">Recent history window</div></article>
      <article className="dash-metric"><span className="dash-metric-icon blue">↗</span><span className="dash-metric-label">Best recent net speed</span><strong>{fmt(bestSpeed, bestSpeed === null ? "" : " WPM")}</strong><small>in the results shown</small><div className="dash-metric-foot"><span className="dash-positive">●</span> Accuracy matters too</div></article>
      <article className="dash-metric"><span className="dash-metric-icon purple">◎</span><span className="dash-metric-label">Recent average accuracy</span><strong>{fmt(averageAccuracy, averageAccuracy === null ? "" : "%")}</strong><small>across the results shown</small><div className="dash-metric-foot">Target consistency, not luck</div></article>
      <article className="dash-metric"><span className="dash-metric-icon amber">⌁</span><span className="dash-metric-label">Average speed</span><strong>{fmt(averageSpeed, averageSpeed === null ? "" : " WPM")}</strong><small>net WPM average</small><div className="dash-metric-foot">{results?.length ? "Based on your saved results" : "Complete a test to start tracking"}</div></article>
    </section>

    <section className="dash-analytics-grid">
      <article className="dash-panel dash-speed-panel"><div className="dash-panel-head"><div><span className="dash-eyebrow">PERFORMANCE</span><h3>Speed over recent tests</h3></div><span className="dash-panel-chip">NET WPM</span></div><div className="dash-chart-summary"><strong>{fmt(averageSpeed, averageSpeed === null ? "" : " WPM")}</strong><span>average speed</span></div><MiniLine values={trend}/><div className="dash-chart-axis"><span>Older attempts</span><span>Recent attempts</span></div>{!results?.length && <p className="dash-chart-empty">Your speed trend will appear after your first saved test.</p>}</article>
      <article className="dash-panel dash-accuracy-panel"><div className="dash-panel-head"><div><span className="dash-eyebrow">PRECISION</span><h3>Accuracy snapshot</h3></div><span className="dash-metric-icon purple">◎</span></div><div className="dash-ring-wrap"><div className="dash-ring" style={{"--accuracy":`${Math.max(0,Math.min(100,averageAccuracy ?? 0))}%`} as CSSProperties}><div><strong>{fmt(averageAccuracy, averageAccuracy === null ? "" : "%")}</strong><span>average accuracy</span></div></div></div><p className="dash-panel-note">{results?.length ? "Build repeatable accuracy before pushing for higher speed." : "Complete a practice test to start measuring accuracy."}</p></article>
      <article className="dash-panel dash-focus-panel"><span className="dash-eyebrow">YOUR NEXT STEP</span><h3>{results?.length ? "Make your next session count" : "Start your progress journey"}</h3><p>{results?.length ? "Review your last attempt, identify recurring errors, then practise one focused passage." : "Take a short test to establish your baseline. Your speed, accuracy and history will populate here."}</p><a className="dash-secondary-btn" href={results?.length ? "/dashboard" : "/test"}>{results?.length ? "Review my results" : "Take first test"} <span>↗</span></a><div className="dash-focus-decoration" aria-hidden="true">TSZ<span>PROGRESS / 01</span></div></article>
    </section>

    <section className="dash-quick-section"><div className="dash-section-heading"><div><span className="dash-eyebrow">JUMP BACK IN</span><h2>Quick access</h2></div></div><div className="dash-quick-grid">
      <a href="/test" className="dash-quick-card quick-cyan"><span className="dash-quick-icon">⌨</span><span><strong>Start practice</strong><small>Build speed with a focused test</small></span><b>↗</b></a>
      <a href="/library" className="dash-quick-card quick-purple"><span className="dash-quick-icon">▤</span><span><strong>Passage library</strong><small>Browse and search passages</small></span><b>↗</b></a>
      <a href="/simulators" className="dash-quick-card quick-blue"><span className="dash-quick-icon">▦</span><span><strong>Explore exams</strong><small>Find your exam pattern</small></span><b>↗</b></a>
      <a href="/simulators" className="dash-quick-card quick-red"><span className="dash-quick-icon">◉</span><span><strong>Live exam practice</strong><small>Check available simulators</small></span><b>↗</b></a>
      <a href="/dashboard" className="dash-quick-card quick-amber"><span className="dash-quick-icon">◷</span><span><strong>My results</strong><small>Review attempts and errors</small></span><b>↗</b></a>
    </div></section>

    <section className="dash-exams-section"><div className="dash-section-heading"><div><span className="dash-eyebrow">EXAM-READY PRACTICE</span><h2>Popular exam simulators</h2><p>Exam-specific timing, display modes and scoring rules where configured.</p></div><a href="/simulators">View all exams <span>↗</span></a></div>
      {exams.length === 0 ? <div className="dash-empty-panel">{error || "Exam options are loading. You can open the full exam catalogue."} <a href="/simulators">Browse exams ↗</a></div> : <div className="dash-exam-grid">{sortedExams.map((exam,index)=>{const m=markFor(exam.slug);const target=targetFor(exam);return <article className={`dash-exam-card tone-${m.tone}`} key={exam.slug}><div className="dash-exam-card-top"><ExamEmblem slug={exam.slug} mark={m.mark} short={m.short} family={m.family} tone={m.tone}/><div className="dash-exam-labels"><span className="dash-exam-family">{m.family}</span><span className={`dash-exam-tag ${index===0?"tag-popular":index===1?"tag-trending":""}`}>{index===0?"POPULAR":index===1?"TRENDING":exam.language==="hi"?"HINDI":"EXAM PATTERN"}</span></div></div><h3>{exam.name}</h3><p>{exam.description || "Practise with the configured exam timing and typing rules."}</p><div className="dash-exam-meta"><span>{exam.language==="hi"?"हिंदी":"English"}</span><i/><span>{Math.max(1,Math.round(exam.duration_sec/60))} min</span><i/><span>{target ? `${target} WPM` : "Target configured"}</span></div><a href={`/simulators/${exam.slug}`} className="dash-exam-cta">Start practice <span>↗</span></a></article>;})}</div>}
    </section>

    <section className="dash-bottom-grid">
      <article className="dash-panel dash-passage-panel"><div className="dash-panel-head"><div><span className="dash-eyebrow">DAILY ROUTINE</span><h3>Today's passages</h3></div><a href="/library">View all ↗</a></div><div className="dash-language-tabs" role="group" aria-label="Filter passages by language"><button className={language==="all"?"selected":""} onClick={()=>setLanguage("all")}>All</button><button className={language==="en"?"selected":""} onClick={()=>setLanguage("en")}>English</button><button className={language==="hi"?"selected":""} onClick={()=>setLanguage("hi")}>हिंदी</button></div>{filteredPassages.length ? filteredPassages.map(p=><div className="dash-passage-row" key={p.id}><span className="dash-passage-number">{passageId(p)}</span><div className="dash-passage-copy"><strong>{p.title}</strong><small>{p.language==="hi"?"Hindi":"English"} · {p.word_count} words</small></div><a href={`/library?id=${encodeURIComponent(p.id)}`} aria-label={`Open ${p.title}`}>Practice ↗</a></div>) : <p className="dash-empty-copy">Today's passages will appear here when the library is available. <a href="/library">Open passage library</a>.</p>}</article>
      <article className="dash-panel dash-library-panel"><div className="dash-panel-head"><div><span className="dash-eyebrow">FIND A PASSAGE</span><h3>Passage library</h3></div><a href="/library">Open library ↗</a></div><p className="dash-panel-note">Search by title or visible passage number (for example, 01).</p><form className="dash-passage-search" onSubmit={e=>{e.preventDefault();navTo(`/library?q=${encodeURIComponent(search)}`)}}><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search passage ID or title" aria-label="Search passage ID or title"/><button type="submit">Search</button></form><div className="dash-library-shortcuts"><a href="/library?lang=en"><span>EN</span><div><strong>English passages</strong><small>Browse English practice texts</small></div><b>→</b></a><a href="/library?lang=hi"><span>हि</span><div><strong>Hindi passages</strong><small>Browse Hindi practice texts</small></div><b>→</b></a></div></article>
      <article className="dash-panel dash-live-panel"><div className="dash-panel-head"><div><span className="dash-eyebrow">SCHEDULE</span><h3>Live exams</h3></div><span className="dash-live-badge"><i/> LIVE</span></div><div className="dash-live-empty"><span className="dash-live-icon">◷</span><strong>No upcoming live exam listed</strong><p>When a scheduled test is published, it will appear here. Meanwhile, practise with an exam simulator.</p><a href="/simulators" className="dash-secondary-btn">Explore simulators ↗</a></div></article>
    </section>
    {signedOut && <p className="dash-session-note">You’re browsing in guest mode. <a href="/login">Sign in</a> to save your progress and see your personal history.</p>}
    {error && <p className="dash-session-note">{error}</p>}
  </div>;
}
