"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, del, fmtDate } from "@/lib/clientApi";

export default function SavedPassages() {
  const [passages, setPassages] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [removing, setRemoving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const r = await api("/api/saved");
      if (r.ok) setPassages(Array.isArray(r.data) ? r.data : []);
      else { setPassages([]); setLoadError(r.status === 401 ? "Sign in to view your saved passages." : r.data?.error ?? "Could not load saved passages."); }
    } catch {
      setPassages([]);
      setLoadError("Unable to connect. Check your connection and try again.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    setRemoving(id);
    setMsg("");
    try {
      const r = await del(`/api/saved?passageId=${encodeURIComponent(id)}`);
      if (r.ok) {
        setPassages((current) => current?.filter((passage) => passage.id !== id) ?? []);
        setMsg("Passage removed from your saved list.");
      } else setMsg(r.data?.error ?? "Could not remove this passage. Please try again.");
    } catch {
      setMsg("Unable to connect. Please try again.");
    } finally {
      setRemoving(null);
    }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (passages ?? []).filter((p) => {
      const matchesLanguage = language === "all" || p.language === language;
      const matchesQuery = !term || [p.title, p.id, p.exam, p.preview].some((value) => String(value ?? "").toLowerCase().includes(term));
      return matchesLanguage && matchesQuery;
    });
  }, [passages, query, language]);

  if (!passages && !loadError) return <main className="page saved-page"><div className="saved-loading" role="status" aria-live="polite"><span className="results-loading-mark" aria-hidden="true" /><strong>Loading saved passages</strong><p>Retrieving your personal practice list…</p></div></main>;

  return (
    <main className="page saved-page">
      <header className="saved-heading">
        <div><span className="results-eyebrow">YOUR PRACTICE LIBRARY</span><h1>Saved passages</h1><p>Keep useful passages close and return to them whenever you practise.</p></div>
        <a className="saved-browse-action" href="/library">Browse passage library <span aria-hidden="true">→</span></a>
      </header>
      {msg && <p className="saved-feedback" role="status" aria-live="polite">{msg}</p>}
      {loadError ? <section className="saved-empty-state"><span aria-hidden="true">!</span><h2>Saved passages unavailable</h2><p>{loadError}</p>{loadError.startsWith("Sign in") ? <a className="saved-browse-action" href="/login">Sign in</a> : <button className="saved-browse-action" onClick={() => void load()}>Try again</button>}</section> :
      !passages?.length ? <section className="saved-empty-state"><span aria-hidden="true">♡</span><h2>Your saved list is empty</h2><p>Save passages from the library and they will appear here for quick access later.</p><a className="saved-browse-action" href="/library">Explore passage library <span aria-hidden="true">→</span></a></section> : <>
        <section className="saved-toolbar" aria-label="Filter saved passages">
          <div className="saved-count"><strong>{passages.length}</strong><span>{passages.length === 1 ? "saved passage" : "saved passages"}</span></div>
          <label className="saved-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, exam or passage ID" aria-label="Search saved passages" /></label>
          <label className="saved-language-filter"><span>Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="all">All languages</option><option value="en">English</option><option value="hi">Hindi</option></select></label>
        </section>
        {filtered.length ? <section className="saved-list" aria-label="Your saved passages">
          {filtered.map((p) => <article key={p.id} className="saved-card">
            <div className="saved-card-main"><div className="saved-card-top"><span className="saved-id">{p.id}</span><span className="saved-language">{p.language === "hi" ? "Hindi" : "English"}</span>{p.exam && <span className="saved-exam">{p.exam}</span>}</div><h2>{p.title}</h2><p className="saved-preview">{p.preview}{p.preview && !String(p.preview).endsWith("…") ? "…" : ""}</p><div className="saved-card-meta"><span>{p.word_count ?? "—"} words</span><span>Saved {fmtDate(p.saved_at)}</span></div></div>
            <div className="saved-card-actions"><a className="saved-practice-action" href="/test">Practice <span aria-hidden="true">→</span></a><button className="saved-remove-action" onClick={() => void remove(p.id)} disabled={removing === p.id}>{removing === p.id ? "Removing…" : "Remove"}</button></div>
          </article>)}
        </section> : <section className="saved-filter-empty"><h2>No matching passages</h2><p>Try another search term or change the language filter.</p><button className="saved-remove-action" onClick={() => { setQuery(""); setLanguage("all"); }}>Clear filters</button></section>}
      </>}
    </main>
  );
}
