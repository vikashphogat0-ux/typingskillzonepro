"use client";
import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/clientApi";

interface P { id: string; title: string; word_count: number; language?: string; body?: string; date?: string; preview?: string; exam?: string | null }
type LibraryData = { today?: string; daily: Record<string, P | undefined>; archive: Record<string, P[]>; list: P[] };
export default function Library() {
  const [d, setD] = useState<LibraryData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<"today" | "archive" | "all">("today");
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("");
  const [list, setList] = useState<P[]>([]);
  const [open, setOpen] = useState<P | null>(null);
  const [printing, setPrinting] = useState<P | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    api("/api/library").then(r => {
      if (!active) return;
      if (r.ok) setD(r.data);
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
    if (printing?.body) {
      const t = setTimeout(() => window.print(), 100);
      const done = () => setPrinting(null);
      window.addEventListener("afterprint", done, { once: true });
      return () => { clearTimeout(t); window.removeEventListener("afterprint", done); };
    }
  }, [printing]);
  const view = async (p: P) => {
    if (open?.id === p.id) { setOpen(null); return; }
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
        <h4>{p.title}</h4>
        <p className="hint">{p.word_count} words · {fmtDate(p.date)}</p>
        <div className={`passage-box${lg === "hi" ? " hi" : ""}`} lang={lg}>{p.body}</div>
        <div className="library-day-actions"><a className="go" href={`/api/library/download?date=${p.date}&lang=${lg}`}>Download passage</a><button className="go alt" onClick={() => print(p)}>Print</button><a className="go alt" href="/test">Practise now ↗</a></div>
      </div>
    </article>
  );
  return (
    <div className="page library-page">
      <section className="library-hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PRACTICE RESOURCE</div>
        <h1>Passage Library</h1>
        <p>Build consistency with focused English and Hindi passages. Browse today’s practice, revisit recent passages, or search the collection by title and language.</p>
        <div className="cta-group"><a className="go hero-primary" href="/test">Start a practice test <span>→</span></a><a className="go hero-secondary" href="/simulators">Explore exam options</a></div>
      </section>
      <div className="tabs" role="tablist" aria-label="Passage library sections">
        {(["today", "archive", "all"] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "today" ? "Today’s passages" : t === "archive" ? "14-day archive" : "Search library"}</button>)}
      </div>
      {loadError && <div className="empty-state"><b>We couldn’t load today’s passages.</b><p>{loadError}</p><button className="go alt" onClick={retry}>Try again</button></div>}
      {tab === "today" && !loadError && (!d ? <div className="exam-loading"><span className="loading-pulse" /> Loading today’s passages…</div> : (
        <>
          <div className="library-intro"><div><h2>Today’s practice set</h2><p>Pick one language or practise both to build daily consistency.</p></div><a className="text-link" href="/api/library/download?pack=today">Download today’s set ↗</a></div>
          {!d.daily?.en && !d.daily?.hi ? <div className="empty-state"><b>No daily passages available yet.</b><p>Please check back later or explore the searchable collection.</p><button className="go alt" onClick={() => setTab("all")}>Search all passages</button></div> : <div className="library-day-grid">{d.daily?.en && <Card lg="en" p={d.daily.en} />}{d.daily?.hi && <Card lg="hi" p={d.daily.hi} />}</div>}
        </>
      ))}
      {tab === "archive" && !loadError && (!d ? <div className="exam-loading">Loading archive…</div> : <section className="library-archive">
        <div className="library-intro"><div><h2>Recent passage archive</h2><p>Browse the rotating daily selection from the last 14 days.</p></div></div>
        {(["en", "hi"] as const).map(l => <div key={l}><h3>{l === "hi" ? "हिन्दी" : "English"}</h3><div className="tbl"><table><thead><tr><th>Date</th><th>Passage</th><th>Words</th><th>Download</th></tr></thead><tbody>
          {(d.archive?.[l] ?? []).map((x: P) => <tr key={`${l}-${x.date}`}><td>{fmtDate(x.date)}</td><td>{x.title}</td><td>{x.word_count}</td><td><a href={`/api/library/download?date=${x.date}&lang=${l}`}>Download</a></td></tr>)}
          {!(d.archive?.[l] ?? []).length && <tr><td colSpan={4}>No passages available for this period.</td></tr>}
        </tbody></table></div></div>)}
      </section>)}
      {tab === "all" && <section className="library-archive">
        <div className="library-intro"><div><h2>Search all passages</h2><p>Filter by title and language, then view, download, or print.</p></div></div>
        <div className="library-tools"><label>Search by title<input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. digital India, education…" /></label><label>Language<select value={lang} onChange={e => setLang(e.target.value)}><option value="">Both languages</option><option value="en">English</option><option value="hi">Hindi</option></select></label></div>
        {searching && <p className="hint">Searching passages…</p>}
        <div className="plist">{list.map(p => <article key={p.id} className="pitem">
          <div><b>{p.title}</b> <span className="tag">{p.language === "hi" ? "Hindi" : "English"}</span>{p.exam && <span className="tag">{p.exam}</span>} <span className="hint">{p.word_count} words</span></div>
          {open?.id === p.id ? <div className={`passage-box${p.language === "hi" ? " hi" : ""}`} lang={p.language}>{open.body}</div> : <p className="hint">{p.preview || "Open to read this passage."}{p.preview ? "…" : ""}</p>}
          <p><button className="link" onClick={() => view(p)}>{open?.id === p.id ? "Hide passage" : "Read passage"}</button> · <a href={`/api/library/download?id=${encodeURIComponent(p.id)}`}>Download</a> · <button className="link" onClick={() => print(p)}>Print</button></p>
        </article>)}{!searching && !list.length && <div className="empty-state"><b>No passages found.</b><p>Try a different title or language filter.</p></div>}</div>
      </section>}
      {printing && <div className="print-area"><h1>{printing.title}</h1><p className={printing.language === "hi" || /[\u0900-\u097F]/.test(printing.body ?? "") ? "hi" : ""}>{printing.body}</p></div>}
    </div>
  );
}