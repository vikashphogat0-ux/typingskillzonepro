"use client";
import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/clientApi";

interface P { id: string; passage_number?: number; title: string; word_count: number; language?: string; body?: string; date?: string; preview?: string; exam?: string | null }
type LibraryData = { today?: string; daily: Record<string, P | undefined>; archive: Record<string, P[]>; list: P[]; months?: string[]; monthly?: P[]; localFallback?: boolean; notice?: string };
const passageLabel = (p: P) => String(p.passage_number ?? 1).padStart(2, "0");
const currentISTMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(new Date().getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function Library() {
  const [d, setD] = useState<LibraryData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<"today" | "archive" | "all">("all");
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("");
  const [list, setList] = useState<P[]>([]);
  const [open, setOpen] = useState<P | null>(null);
  const [printing, setPrinting] = useState<P | null>(null);
  const [searching, setSearching] = useState(false);
  const [month, setMonth] = useState(currentISTMonth);
  const [monthly, setMonthly] = useState<P[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthLang, setMonthLang] = useState<"all" | "en" | "hi">("all");
  const [selectedPassage, setSelectedPassage] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/library").then(r => {
      if (!active) return;
      if (r.ok) { setD(r.data); setLoadError(""); }
      else setLoadError(r.data?.error ?? "The passage library could not be loaded.");
    }).catch(() => { if (active) setLoadError("Connection issue while loading passages."); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      setSearching(true);
      api(`/api/library?q=${encodeURIComponent(q)}${lang ? `&lang=${lang}` : ""}`)
        .then(r => { if (active && r.ok) setList(Array.isArray(r.data?.list) ? r.data.list : []); })
        .catch(() => { if (active) setList([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [q, lang]);
  useEffect(() => {
    let active = true;
    setMonthLoading(true);
    api(`/api/library?month=${encodeURIComponent(month)}${monthLang === "all" ? "" : `&lang=${monthLang}`}`)
      .then(r => {
        if (!active || !r.ok) return;
        setMonthly(Array.isArray(r.data?.monthly) ? r.data.monthly : []);
        if (r.data?.months?.length && !r.data.months.includes(month)) setMonth(r.data.months[0]);
      })
      .catch(() => { if (active) setMonthly([]); })
      .finally(() => { if (active) setMonthLoading(false); });
    return () => { active = false; };
  }, [month, monthLang]);
  useEffect(() => {
    if (printing?.body) {
      const t = setTimeout(() => window.print(), 100);
      const done = () => setPrinting(null);
      window.addEventListener("afterprint", done, { once: true });
      return () => { clearTimeout(t); window.removeEventListener("afterprint", done); };
    }
  }, [printing]);
  const view = async (p: P, toggle = true) => {
    if (toggle && open?.id === p.id) { setOpen(null); return; }
    if (p.body) { setOpen(p); return; }
    const r = await api(`/api/library?id=${encodeURIComponent(p.id)}`);
    if (r.ok) setOpen(r.data);
  };
  const print = async (p: P) => {
    const full = p.body ? p : (await api(`/api/library?id=${encodeURIComponent(p.id)}`)).data;
    if (full?.body) setPrinting(full);
  };
  const retry = () => { setLoadError(""); api("/api/library").then(r => { if (r.ok) setD(r.data); else setLoadError(r.data?.error ?? "Unable to load the library."); }).catch(() => setLoadError("Connection issue while loading passages.")); };
  const Card = ({ lg, p }: { lg: string; p: P }) => (
    <article className="library-day-card">
      <div className="library-day-head"><h3>{lg === "hi" ? "हिन्दी अभ्यास" : "English practice"}</h3><span>{lg === "hi" ? "Hindi" : "English"}</span></div>
      <div className="library-day-body">
        <div className="passage-title-row"><h4>{p.title}</h4><span className="passage-id-badge">Passage {passageLabel(p)}</span></div>
        <p className="hint">{p.word_count} words · {fmtDate(p.date)}</p>
        <div className={`passage-box${lg === "hi" ? " hi" : ""}`} lang={lg}>{p.body}</div>
        <div className="library-day-actions"><a className="go" href={`/api/library/download?date=${p.date}&lang=${lg}`}>Download text</a><button className="go alt" onClick={() => print(p)}>Save as PDF / Print</button><a className="go alt" href="/test">Practise now ↗</a></div>
      </div>
    </article>
  );
  return (
    <div className="page library-page">
      <section className="library-hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> TYPINGSKILLZONE PASSAGE COLLECTION</div>
        <h1>Typing Test Passages</h1>
        <p>Browse the latest exam-wise typing matter. Open a passage to read it, download a text copy, print it as PDF or start a practice test.</p>
        <div className="library-stat-row">
          <div><strong>{d?.list?.length ?? "—"}</strong><span>Available passages</span></div>
          <div><strong>{d?.months?.length ?? "—"}</strong><span>Archive months</span></div>
          <div><strong>EN + HI</strong><span>English & Hindi</span></div>
        </div>
        <div className="cta-group"><a className="go hero-primary" href="/test">Start typing practice</a><a className="go hero-secondary" href="/simulators">Exam simulators</a></div>
      </section>
      <div id="library-content" className="library-section-heading"><div><h2>Typing Test Passages</h2><p>Select a section to browse the latest passages or monthly collections.</p></div><div className="tabs" role="tablist" aria-label="Passage library sections">
        {(["today", "archive", "all"] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "today" ? "Daily passages" : t === "archive" ? "Month-wise archive" : "All passages"}</button>)}
        </div></div>
      {d?.localFallback && <div className="data-source-notice" role="status"><strong>Temporary sample mode</strong><p>{d.notice ?? "The database-backed passage library is unavailable. Built-in samples are shown temporarily."} Real library records will return when the database connection and schema are repaired.</p></div>}
      {loadError && <div className="empty-state"><b>We couldn’t load today’s passages.</b><p>{loadError}</p><button className="go alt" onClick={retry}>Try again</button></div>}
      {tab === "today" && !loadError && (!d ? <div className="exam-loading"><span className="loading-pulse" /> Loading today’s passages…</div> : (
        <>
          <div className="library-intro"><div><h2>Today’s practice set</h2><p>Pick one language or practise both to build daily consistency.</p></div><a className="text-link" href="/api/library/download?pack=today">Download text set ↗</a></div>
          {!d.daily?.en && !d.daily?.hi ? <div className="empty-state"><b>No daily passages available yet.</b><p>Please check back later or explore the searchable collection.</p><button className="go alt" onClick={() => setTab("all")}>Search all passages</button></div> : <div className="library-day-grid">{d.daily?.en && <Card lg="en" p={d.daily.en} />}{d.daily?.hi && <Card lg="hi" p={d.daily.hi} />}</div>}
        </>
      ))}
      {tab === "archive" && !loadError && <section className="library-archive library-month-browser">
        <div className="library-intro"><div><h2>Browse the passage collection</h2><p>Choose a month, then select a passage to read, practise, download or print.</p></div></div>
        <div className="library-month-toolbar">
          <label>Practice month<select value={month} onChange={e => setMonth(e.target.value)}>{(d?.months?.length ? d.months : [month]).map(m => <option key={m} value={m}>{new Date(`${m}-01T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}</select></label>
          <label className="library-month-language">Passage folder<select value={monthLang} onChange={e => setMonthLang(e.target.value as "all" | "en" | "hi")}><option value="all">All passages</option><option value="en">English folder</option><option value="hi">Hindi folder</option></select></label><span className="library-month-count">{monthLoading ? "Loading passages…" : `${monthly.length} passage${monthly.length === 1 ? "" : "s"} in this month`}</span>
        </div>
        {!monthLoading && monthly.length === 0 ? <div className="empty-state"><b>No passages found for this month.</b><p>Choose another month or use Search Library to find any available passage.</p><button className="go alt" onClick={() => setTab("all")}>Search all passages</button></div> :
          <div className="library-month-list">{monthly.map((p, index) => <article key={p.id} className={`library-month-item ${selectedPassage === p.id ? "selected" : ""}`}>
            <div className="library-month-select">
              <span className="library-row-number">{index + 1}</span>
              <span className={`library-language-mark ${p.language === "hi" ? "hindi" : "english"}`}>{p.language === "hi" ? "हि" : "EN"}</span>
              <span className="library-month-title"><strong>{p.title}</strong><small>{p.language === "hi" ? "Hindi" : "English"} · {p.word_count} words · Passage ID: {passageLabel(p)}{p.exam ? ` · ${p.exam}` : ""}</small></span>
              <span className="library-row-actions"><button className="library-action" onClick={() => { setSelectedPassage(p.id); void view(p, false); }}>{selectedPassage === p.id ? "Selected" : "View"}</button><a className="library-action" href={`/api/library/download?id=${encodeURIComponent(p.id)}`}>Download</a></span>
            </div>
            {selectedPassage === p.id && <div className="library-month-detail">
              <div className={`passage-box ${p.language === "hi" ? "hi" : ""}`} lang={p.language}>{open?.id === p.id ? open.body : (p.preview || "Open this passage to load its full text.")}</div>
              <div className="library-day-actions"><a className="go" href={`/api/library/download?id=${encodeURIComponent(p.id)}`}>Download text</a><button className="go alt" onClick={() => print(open?.id === p.id ? open : p)}>Save as PDF / Print</button><a className="go alt" href={`/test?passage=${encodeURIComponent(p.id)}`}>Practise this passage ↗</a></div>
            </div>}
          </article>)}</div>}
      </section>}
      {tab === "all" && <section className="library-archive">
        <div className="library-intro"><div><h2>All available passages</h2><p>Latest additions appear first. Search by passage ID, title or words, then view or download any passage.</p></div></div>
        <div className="library-tools"><label>Search passages<input value={q} onChange={e => setQ(e.target.value)} placeholder="Enter passage ID, title or words from the passage…" /></label><label>Language folder<select value={lang} onChange={e => setLang(e.target.value)}><option value="">All languages</option><option value="en">English only</option><option value="hi">Hindi only</option></select></label><button className="go alt" onClick={() => { setQ(""); setLang(""); }}>Clear filters</button></div>
        {searching && <p className="hint">Searching passages…</p>}
        <p className="hint" aria-live="polite">{searching ? "Searching…" : `${list.length} passage${list.length === 1 ? "" : "s"} found`}</p><div className="plist">{list.map((p, index) => <article key={p.id} className="pitem library-list-row">
          <div className="library-list-row-head"><span className="library-row-number">{index + 1}</span><div className="library-list-row-title"><b>{p.title}</b> <span className="tag">{p.language === "hi" ? "Hindi folder" : "English folder"}</span> <span className="tag passage-id-tag">Passage ID: {passageLabel(p)}</span>{p.exam && <span className="tag">{p.exam}</span>} <span className="hint">{p.word_count} words</span></div><div className="library-row-actions"><button className="library-action" onClick={() => view(p)}>{open?.id === p.id ? "Hide" : "View"}</button><a className="library-action" href={`/api/library/download?id=${encodeURIComponent(p.id)}`}>Download</a></div></div>
          {open?.id === p.id ? <div className={`passage-box${p.language === "hi" ? " hi" : ""}`} lang={p.language}>{open.body}</div> : <p className="hint">{p.preview || "Open to read this passage."}{p.preview ? "…" : ""}</p>}
          <p><button className="link" onClick={() => view(p)}>{open?.id === p.id ? "Hide passage" : "Read full passage"}</button> · <a href={`/api/library/download?id=${encodeURIComponent(p.id)}`}>Download text</a> · <button className="link" onClick={() => print(open?.id === p.id ? open : p)}>Save as PDF / Print</button> · <a href={`/test?passage=${encodeURIComponent(p.id)}`}>Practise this passage ↗</a></p>
        </article>)}{!searching && !list.length && <div className="empty-state"><b>No passages found.</b><p>Try a different title or language filter.</p></div>}</div>
      </section>}
      {printing && <div className="print-area"><h1>{printing.title}</h1><p className={printing.language === "hi" || /[\u0900-\u097F]/.test(printing.body ?? "") ? "hi" : ""}>{printing.body}</p></div>}
    </div>
  );
}