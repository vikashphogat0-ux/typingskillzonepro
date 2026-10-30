"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/clientApi";

type Exam = { slug: string; name: string; language: string; duration_sec: number; description?: string };
type Family = "Police & Paramilitary" | "Staff Selection" | "Railway & Courts" | "Other";

function examFamily(exam: Exam): Family {
  const value = `${exam.slug} ${exam.name}`.toLowerCase();
  if (/delhi.?police|bsf|cisf|crpf|ssb|itbp|capf|police/.test(value)) return "Police & Paramilitary";
  if (/ssc|dsssb|dda|staff selection/.test(value)) return "Staff Selection";
  if (/rrb|railway|court|high.?court|judicial/.test(value)) return "Railway & Courts";
  return "Other";
}

const families: Family[] = ["Police & Paramilitary", "Staff Selection", "Railway & Courts", "Other"];
const popularTerms = ["Delhi Police", "BSF", "SSC CGL", "SSC CHSL", "RRB", "DSSSB", "High Court", "CISF"];

export default function ExamsPage() {
  const [items, setItems] = useState<Exam[]>([]);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [family, setFamily] = useState<"all" | Family>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/templates")
      .then(result => {
        if (!active) return;
        if (result.ok && Array.isArray(result.data)) setItems(result.data);
        else setError(result.data?.error || "The exam catalogue is temporarily unavailable.");
      })
      .catch(() => { if (active) setError("Unable to connect to the exam catalogue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => items.filter(exam => {
    const query = q.trim().toLowerCase();
    const matchesQuery = !query || exam.name.toLowerCase().includes(query) || exam.slug.toLowerCase().includes(query);
    const matchesLanguage = lang === "all" || exam.language === lang;
    const matchesFamily = family === "all" || examFamily(exam) === family;
    return matchesQuery && matchesLanguage && matchesFamily;
  }), [items, q, lang, family]);

  const grouped = useMemo(() => families
    .map(name => ({ name, exams: filtered.filter(exam => examFamily(exam) === name) }))
    .filter(group => group.exams.length > 0), [filtered]);

  return (
    <main className="public-page exam-directory-page">
      <nav className="crumbs"><a href="/">Home</a> / All typing examinations</nav>
      <section className="exam-directory-hero">
        <span className="public-kicker">Complete exam directory</span>
        <h1 className="public-title">Choose your typing examination</h1>
        <p className="public-lead">Browse available recruitment tests by exam family and language. Open an exam to review its instructions, select a passage and begin the configured typing test.</p>
        <div className="exam-directory-stats">
          <span><strong>{items.length}</strong> available profiles</span>
          <span><strong>EN</strong> English tests</span>
          <span><strong>हि</strong> Hindi tests</span>
        </div>
      </section>

      <section className="exam-directory-controls" aria-label="Filter examinations">
        <label className="exam-directory-search"><span>Search exam name or keyword</span><input className="public-search" placeholder="e.g. Delhi Police, BSF, SSC CGL…" value={q} onChange={event => setQ(event.target.value)} /></label>
        <label><span>Language</span><select value={lang} onChange={event => setLang(event.target.value)}><option value="all">All languages</option><option value="en">English</option><option value="hi">Hindi</option></select></label>
        <label><span>Exam category</span><select value={family} onChange={event => setFamily(event.target.value as "all" | Family)}><option value="all">All categories</option>{families.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        <button className="site-button secondary" onClick={() => { setQ(""); setLang("all"); setFamily("all"); }}>Reset filters</button>
      </section>

      <div className="exam-directory-shortcuts">
        <span>Popular searches</span>
        {popularTerms.map(term => <button key={term} onClick={() => { setQ(term); setFamily("all"); }}>{term}</button>)}
      </div>

      {loading ? <div className="empty-state">Loading available exam profiles…</div> :
        error ? <div className="empty-state" role="alert">{error} <a href="/simulators">Open simulator catalogue</a>.</div> :
        filtered.length === 0 ? <div className="empty-state">No exam profiles match these filters. Try a different search or reset the filters.</div> :
        <div className="exam-directory-groups">
          {grouped.map(group => (
            <section className="exam-directory-group" key={group.name}>
              <div className="exam-directory-group-head"><div><span className="public-kicker">Exam family</span><h2>{group.name}</h2></div><span>{group.exams.length} {group.exams.length === 1 ? "profile" : "profiles"}</span></div>
              <div className="exam-grid">
                {group.exams.map(exam => (
                  <article className="exam-card" key={exam.slug}>
                    <div className="exam-card-top"><span className="exam-mark">{exam.name.slice(0, 3).toUpperCase()}</span><span className="exam-meta">{exam.language === "hi" ? "हिन्दी" : "ENGLISH"}</span></div>
                    <h3>{exam.name}</h3>
                    <p>{exam.description || "Open this exam profile to review its configured typing rules and practice options."}</p>
                    <div className="exam-directory-meta"><span>{Math.max(1, Math.round(exam.duration_sec / 60))} min configured duration</span><span>{exam.language === "hi" ? "Hindi" : "English"}</span></div>
                    <a href={`/simulators/${exam.slug}`}>View instructions & start test <span aria-hidden="true">→</span></a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>}

      <div className="exam-directory-footer"><a className="site-button secondary" href="/library">Open Passage Library</a><a className="site-button" href="/test">Start free practice</a></div>
    </main>
  );
}
