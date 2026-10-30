"use client";

import { useEffect, useMemo, useState } from "react";
import { api, fmtDate } from "@/lib/clientApi";

interface P {
  id: string;
  passage_number?: number;
  title: string;
  word_count: number;
  language?: string;
  body?: string;
  date?: string;
  preview?: string;
  exam?: string | null;
}
type LibraryData = {
  today?: string;
  daily: Record<string, P | undefined>;
  archive: Record<string, P[]>;
  list: P[];
  months?: string[];
  monthly?: P[];
  localFallback?: boolean;
  notice?: string;
};
type Section = "today" | "archive" | "all";
type LanguageFilter = "all" | "en" | "hi";

const passageLabel = (p: P) => String(p.passage_number ?? 1).padStart(2, "0");
const currentISTMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(new Date().getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};
const monthLabel = (value: string) => {
  const date = new Date(`${value}-01T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
const languageName = (language?: string) => language === "hi" ? "Hindi" : "English";

export default function Library() {
  const [data, setData] = useState<LibraryData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [section, setSection] = useState<Section>("today");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<LanguageFilter>("all");
  const [results, setResults] = useState<P[]>([]);
  const [selected, setSelected] = useState<P | null>(null);
  const [printing, setPrinting] = useState<P | null>(null);
  const [searching, setSearching] = useState(false);
  const [month, setMonth] = useState(currentISTMonth);
  const [monthly, setMonthly] = useState<P[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthLanguage, setMonthLanguage] = useState<LanguageFilter>("all");

  useEffect(() => {
    let active = true;
    api("/api/library")
      .then(result => {
        if (!active) return;
        if (result.ok) { setData(result.data); setLoadError(""); }
        else setLoadError(result.data?.error ?? "The passage library could not be loaded.");
      })
      .catch(() => { if (active) setLoadError("Connection issue while loading passages."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      api(`/api/library?q=${encodeURIComponent(query)}${language === "all" ? "" : `&lang=${language}`}`)
        .then(result => { if (active && result.ok) setResults(Array.isArray(result.data?.list) ? result.data.list : []); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, language]);

  useEffect(() => {
    let active = true;
    setMonthLoading(true);
    api(`/api/library?month=${encodeURIComponent(month)}${monthLanguage === "all" ? "" : `&lang=${monthLanguage}`}`)
      .then(result => {
        if (!active || !result.ok) return;
        setMonthly(Array.isArray(result.data?.monthly) ? result.data.monthly : []);
        if (result.data?.months?.length && !result.data.months.includes(month)) setMonth(result.data.months[0]);
      })
      .catch(() => { if (active) setMonthly([]); })
      .finally(() => { if (active) setMonthLoading(false); });
    return () => { active = false; };
  }, [month, monthLanguage]);

  useEffect(() => {
    if (!printing?.body) return;
    const timer = setTimeout(() => window.print(), 100);
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener("afterprint", done); };
  }, [printing]);

  const monthOptions = data?.months?.length ? data.months : [month];
  const allCount = data?.list?.length ?? results.length;
  const dailyPassages = useMemo(() => [
    ...(data?.daily?.en ? [data.daily.en] : []),
    ...(data?.daily?.hi ? [data.daily.hi] : []),
  ], [data]);

  const loadPassage = async (passage: P) => {
    if (selected?.id === passage.id) { setSelected(null); return; }
    if (passage.body) { setSelected(passage); return; }
    const result = await api(`/api/library?id=${encodeURIComponent(passage.id)}`);
    if (result.ok && result.data?.body) setSelected(result.data);
  };

  const printPassage = async (passage: P) => {
    const full = passage.body ? passage : (await api(`/api/library?id=${encodeURIComponent(passage.id)}`)).data;
    if (full?.body) setPrinting(full);
  };

  const retry = () => {
    setLoadError("");
    api("/api/library")
      .then(result => { if (result.ok) setData(result.data); else setLoadError(result.data?.error ?? "Unable to load the library."); })
      .catch(() => setLoadError("Connection issue while loading passages."));
  };

  const PassageActions = ({ passage }: { passage: P }) => (
    <div className="rkc-passage-actions">
      <button type="button" className="library-action primary" onClick={() => void loadPassage(passage)}>{selected?.id === passage.id ? "Hide passage" : "View passage"}</button>
      <a className="library-action" href={`/api/library/download?id=${encodeURIComponent(passage.id)}`}>Download TXT</a>
      <button type="button" className="library-action" onClick={() => void printPassage(passage)}>Print / Save PDF</button>
      <a className="library-action" href={`/test?passage=${encodeURIComponent(passage.id)}`}>Practise this passage</a>
    </div>
  );

  const PassagePreview = ({ passage }: { passage: P }) => selected?.id === passage.id ? (
    <div className="rkc-passage-preview">
      <div className="rkc-passage-preview-head"><strong>Full passage · {languageName(passage.language)}</strong><span>{passage.word_count} words</span></div>
      <div className={`passage-box ${passage.language === "hi" ? "hi" : ""}`} lang={passage.language}>{selected.body || "The full passage could not be loaded. Please try again."}</div>
      <PassageActions passage={passage} />
    </div>
  ) : null;

  const LanguageTabs = ({ value, onChange }: { value: LanguageFilter; onChange: (next: LanguageFilter) => void }) => (
    <div className="rkc-language-tabs" role="group" aria-label="Filter by language">
      {(["all", "en", "hi"] as const).map(item => (
        <button type="button" key={item} aria-pressed={value === item} className={value === item ? "active" : ""} onClick={() => onChange(item)}>
          {item === "all" ? "All languages" : item === "en" ? "English" : "हिन्दी"}
        </button>
      ))}
    </div>
  );

  return (
    <main className="page library-page rkc-library-page">
      <nav className="crumbs"><a href="/">Home</a><span>/</span><span>Passage Library</span></nav>

      <section className="library-hero rkc-library-hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> TYPINGSKILLZONE · PASSAGE TEST CENTRE</div>
        <h1>Typing Test Passage Library</h1>
        <p>Daily practice passages, exam-wise typing matter and month-wise collections in English and Hindi. Select a passage to read, download, print or practise in the simulator.</p>
        <div className="library-stat-row">
          <div><strong>{data?.list?.length ?? "—"}</strong><span>Passages in collection</span></div>
          <div><strong>{data?.months?.length ?? "—"}</strong><span>Archive months</span></div>
          <div><strong>02</strong><span>Practice languages</span></div>
          <div><strong>{dailyPassages.length || "—"}</strong><span>Today's live passages</span></div>
        </div>
        <div className="cta-group"><a className="go hero-primary" href="#library-sections">Browse passages <span aria-hidden="true">↓</span></a><a className="go hero-secondary" href="/simulators">Exam simulators ↗</a></div>
      </section>

      <section className="rkc-library-announcement" aria-label="Passage library information">
        <div className="rkc-live-indicator"><span /> DAILY PRACTICE COLLECTION</div>
        <p>Fresh practice matter is organised by language, date and exam category. Use the passage ID to find a specific item quickly.</p>
        <a href="/test">Open typing practice ↗</a>
      </section>

      {data?.localFallback && <div className="data-source-notice" role="status"><strong>Temporary sample mode</strong><p>{data.notice ?? "The database-backed passage library is unavailable. Built-in samples are shown temporarily."} Real library records will return when the database connection and schema are repaired.</p></div>}
      {loadError && <div className="empty-state"><b>We couldn’t load the passage collection.</b><p>{loadError}</p><button className="go alt" onClick={retry}>Try again</button></div>}

      <section id="library-sections" className="rkc-library-workspace">
        <div className="rkc-library-section-head">
          <div><span className="public-kicker">Browse typing matter</span><h2>Passage collections</h2><p>Choose today's practice, browse an archive month or search the full collection.</p></div>
          <div className="rkc-library-total">{allCount} <span>records found</span></div>
        </div>
        <div className="rkc-library-nav" role="tablist" aria-label="Passage collection sections">
          <button type="button" role="tab" aria-selected={section === "today"} onClick={() => setSection("today")}><span>01</span><b>Today's passages</b><small>Daily English & Hindi</small></button>
          <button type="button" role="tab" aria-selected={section === "archive"} onClick={() => setSection("archive")}><span>02</span><b>Monthly archive</b><small>Browse by month</small></button>
          <button type="button" role="tab" aria-selected={section === "all"} onClick={() => setSection("all")}><span>03</span><b>All passages</b><small>Search by ID or title</small></button>
        </div>

        {section === "today" && !loadError && (
          <div className="rkc-library-panel">
            <div className="rkc-panel-heading"><div><span className="public-kicker">Daily live collection</span><h3>Today's English & Hindi passages</h3><p>{data?.today ? fmtDate(data.today) : "The latest passages available in the library"}</p></div><a className="library-action" href="/api/library/download?pack=today">Download today's text set</a></div>
            {!data ? <div className="exam-loading"><span className="loading-pulse" /> Loading today's passages…</div> :
              dailyPassages.length === 0 ? <div className="empty-state"><b>No daily passages available yet.</b><p>Open the monthly archive or search all passages for more practice matter.</p><button className="go alt" onClick={() => setSection("all")}>Search all passages</button></div> :
              <div className="rkc-live-passage-grid">
                {dailyPassages.map(passage => (
                  <article className="rkc-live-passage-card" key={passage.id}>
                    <div className="rkc-live-card-top"><span className={`rkc-language-emblem ${passage.language === "hi" ? "hindi" : "english"}`}>{passage.language === "hi" ? "हि" : "EN"}</span><span className="rkc-live-status"><i /> AVAILABLE</span></div>
                    <div className="rkc-live-card-label">{languageName(passage.language)} typing passage</div>
                    <h3>{passage.title}</h3>
                    <div className="rkc-live-card-meta"><span>Passage {passageLabel(passage)}</span><span>{passage.word_count} words</span><span>ID: {passage.id}</span></div>
                    <PassageActions passage={passage} />
                    <PassagePreview passage={passage} />
                  </article>
                ))}
              </div>}
          </div>
        )}

        {section === "archive" && !loadError && (
          <div className="rkc-library-panel">
            <div className="rkc-panel-heading"><div><span className="public-kicker">Previous practice matter</span><h3>Month-wise passage archive</h3><p>Select a month and language to see its available exam passages.</p></div></div>
            <div className="rkc-archive-controls">
              <label><span>SELECT MONTH</span><select value={month} onChange={event => setMonth(event.target.value)}>{monthOptions.map(item => <option key={item} value={item}>{monthLabel(item)}</option>)}</select></label>
              <LanguageTabs value={monthLanguage} onChange={setMonthLanguage} />
              <span className="rkc-archive-count">{monthLoading ? "Loading…" : `${monthly.length} passage(s)`}</span>
            </div>
            {monthLoading ? <div className="exam-loading"><span className="loading-pulse" /> Loading archive…</div> :
              monthly.length === 0 ? <div className="empty-state"><b>No passages found for {monthLabel(month)}.</b><p>Try another month or switch the language filter.</p></div> :
              <div className="rkc-archive-list">
                <div className="rkc-archive-list-head"><span>NO.</span><span>PASSAGE / EXAM</span><span>DATE</span><span>WORDS</span><span>ACTIONS</span></div>
                {monthly.map((passage, index) => (
                  <article className="rkc-archive-row" key={passage.id}>
                    <span className="rkc-archive-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="rkc-archive-passage">
                      <div><span className={`rkc-mini-language ${passage.language === "hi" ? "hindi" : "english"}`}>{passage.language === "hi" ? "हि" : "EN"}</span><strong>{passage.title}</strong></div>
                      <small>{passage.exam || "Typing practice"} · Passage {passageLabel(passage)} · ID {passage.id}</small>
                    </div>
                    <span className="rkc-archive-date">{passage.date ? fmtDate(passage.date) : "—"}</span>
                    <span className="rkc-archive-words">{passage.word_count}</span>
                    <div className="rkc-archive-actions"><button type="button" className="library-action" onClick={() => void loadPassage(passage)}>{selected?.id === passage.id ? "Hide" : "View"}</button><a className="library-action" href={`/api/library/download?id=${encodeURIComponent(passage.id)}`}>Download</a></div>
                    <PassagePreview passage={passage} />
                  </article>
                ))}
              </div>}
          </div>
        )}

        {section === "all" && !loadError && (
          <div className="rkc-library-panel">
            <div className="rkc-panel-heading"><div><span className="public-kicker">Complete searchable database</span><h3>Find a passage by ID, title or keyword</h3><p>Search the complete passage collection and open any record.</p></div></div>
            <div className="rkc-search-controls">
              <label className="rkc-search-field"><span>SEARCH PASSAGE</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Enter passage ID, title or a word from the text…" /></label>
              <label><span>LANGUAGE</span><select value={language} onChange={event => setLanguage(event.target.value as LanguageFilter)}><option value="all">All languages</option><option value="en">English</option><option value="hi">Hindi</option></select></label>
              <button type="button" className="library-action" onClick={() => { setQuery(""); setLanguage("all"); }}>Clear filters</button>
            </div>
            <div className="rkc-search-status" aria-live="polite">{searching ? "Searching passage records…" : `${results.length} matching passage(s)`}</div>
            {searching ? <div className="exam-loading"><span className="loading-pulse" /> Searching…</div> :
              results.length === 0 ? <div className="empty-state"><b>No passages match this search.</b><p>Check the passage ID or try a broader title or keyword.</p></div> :
              <div className="rkc-archive-list">
                <div className="rkc-archive-list-head"><span>NO.</span><span>PASSAGE / EXAM</span><span>DATE</span><span>WORDS</span><span>ACTIONS</span></div>
                {results.map((passage, index) => (
                  <article className="rkc-archive-row" key={passage.id}>
                    <span className="rkc-archive-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="rkc-archive-passage">
                      <div><span className={`rkc-mini-language ${passage.language === "hi" ? "hindi" : "english"}`}>{passage.language === "hi" ? "हि" : "EN"}</span><strong>{passage.title}</strong></div>
                      <small>{passage.exam || "Typing practice"} · Passage {passageLabel(passage)} · ID {passage.id}</small>
                    </div>
                    <span className="rkc-archive-date">{passage.date ? fmtDate(passage.date) : "—"}</span>
                    <span className="rkc-archive-words">{passage.word_count}</span>
                    <div className="rkc-archive-actions"><button type="button" className="library-action" onClick={() => void loadPassage(passage)}>{selected?.id === passage.id ? "Hide" : "View"}</button><a className="library-action" href={`/api/library/download?id=${encodeURIComponent(passage.id)}`}>Download</a></div>
                    <PassagePreview passage={passage} />
                  </article>
                ))}
              </div>}
          </div>
        )}
      </section>

      {printing && <div className="print-area"><h1>{printing.title}</h1><p className={printing.language === "hi" || /[\u0900-\u097F]/.test(printing.body ?? "") ? "hi" : ""}>{printing.body}</p></div>}
    </main>
  );
}
