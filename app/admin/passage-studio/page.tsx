"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanBody, countWords, parseBulk, validatePassage } from "@/lib/adminValidation";
import type { Lang } from "@/lib/wpmCalculator";

type Template = { slug: string; name: string; language: Lang; is_active: boolean };
type Distribution = { slug: string; name: string; status: string; passageId: string | null };
type Source = {
  id: string; title: string; language: Lang; body: string; word_count: number;
  source_type: string; source_filename: string | null; version: number;
  visible_number: number; created_at: string; archived_at: string | null;
  distributions: Distribution[]; distribution_count: number; published_count: number;
};

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}
const send = (url: string, body: unknown, method = "POST") =>
  request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function PassageStudioPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<Lang>("en");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [destination, setDestination] = useState("all");
  const [fileName, setFileName] = useState("");
  const [extracted, setExtracted] = useState<{ title: string; body: string }[]>([]);
  const [query, setQuery] = useState("");
  const [repositoryLanguage, setRepositoryLanguage] = useState<"all" | Lang>("all");
  const [repositoryDestination, setRepositoryDestination] = useState("all");
  const [editing, setEditing] = useState<Source | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        request("/api/admin/passage-studio" + (showArchived ? "?status=all" : "")),
        request("/api/admin/templates"),
      ]);
      if (a.status === 403 || b.status === 403) { setMessage("Admin access required. Sign in with an administrator account."); return; }
      if (!a.ok || !b.ok) throw new Error(a.data.error ?? b.data.error ?? "Unable to load Passage Studio.");
      setSources(Array.isArray(a.data) ? a.data : []);
      setTemplates(Array.isArray(b.data) ? b.data : []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load Passage Studio."); }
    finally { setLoading(false); }
  }, [showArchived]);

  useEffect(() => { void load(); }, [load]);

  const availableTemplates = templates.filter(t => t.is_active && t.language === language);
  const filtered = useMemo(() => sources.filter(s => {
    const searchMatch = (s.title + " " + s.id + " " + s.body).toLowerCase().includes(query.trim().toLowerCase());
    const languageMatch = repositoryLanguage === "all" || s.language === repositoryLanguage;
    const destinationMatch = repositoryDestination === "all" ||
      s.distributions.some(distribution => distribution.slug === repositoryDestination);
    return searchMatch && languageMatch && destinationMatch;
  }), [sources, query, repositoryLanguage, repositoryDestination]);

  const repositoryStats = useMemo(() => ({
    english: sources.filter(source => !source.archived_at && source.language === "en").length,
    hindi: sources.filter(source => !source.archived_at && source.language === "hi").length,
    archived: sources.filter(source => Boolean(source.archived_at)).length,
    unpublished: sources.filter(source => !source.archived_at && source.published_count === 0).length,
  }), [sources]);

  const extractPdf = async (file?: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setMessage("PDF limit is 20 MB."); return; }
    setBusy(true); setMessage(""); setExtracted([]); setFileName(file.name);
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true }).promise;
      if (pdf.numPages > 200) throw new Error("Maximum 200 pages per import. Split the document first.");
      const pages: { title: string; body: string }[] = [];
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        let previousY: number | null = null;
        const raw = content.items.map((item: any) => {
          if (typeof item.str !== "string" || !item.str.trim()) return "";
          const y = Array.isArray(item.transform) ? Number(item.transform[5]) : null;
          const lineBreak = previousY !== null && y !== null && Math.abs(previousY - y) > 2.5;
          if (y !== null) previousY = y;
          return (lineBreak ? "\n" : " ") + item.str;
        }).join("");
        const cleaned = cleanBody(raw);
        if (countWords(cleaned) >= 30) pages.push({ title: "Passage " + String(pages.length + 1).padStart(2, "0"), body: cleaned });
      }
      if (!pages.length) throw new Error("No selectable passage text found. Scanned PDFs need OCR before import.");
      setExtracted(pages);
      setMessage("Extracted " + pages.length + " passages from " + pdf.numPages + " pages. Review before publishing.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "PDF extraction failed."); }
    finally { setBusy(false); }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setMessage("Upload limit is 20 MB."); return; }
    setFileName(file.name);
    setExtracted([]);
    setMessage("");
    if (/\\.txt$/i.test(file.name) || file.type === "text/plain") {
      setBusy(true);
      try {
        const parsed = parseBulk(await file.text());
        if (!parsed.length) throw new Error("No passages found. Separate passages with a line containing ---.");
        setExtracted(parsed);
        setMessage("Imported " + parsed.length + " text passages. Review and edit each passage before publishing.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Text import failed.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (file.type !== "application/pdf" && !/\\.pdf$/i.test(file.name)) {
      setMessage("Choose a PDF or UTF-8 TXT file.");
      return;
    }
    await extractPdf(file);
  };

  const updateExtracted = (index: number, patch: Partial<{ title: string; body: string }>) => {
    setExtracted(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const publish = async (items: { title: string; body: string }[], sourceType: "manual" | "pdf-import") => {
    if (!items.length || busy) return;
    const checked = items.map(item => validatePassage({ ...item, language }));
    const invalid = checked.findIndex(item => !item.ok);
    if (invalid >= 0) { setMessage("Passage " + (invalid + 1) + ": " + checked[invalid].errors.join(" ")); return; }
    if (destination !== "all" && !availableTemplates.some(t => t.slug === destination)) {
      setMessage("Choose an active simulator that matches this passage language."); return;
    }
    setBusy(true); setMessage("");
    try {
      const result = await send("/api/admin/passages", {
        items: checked.map(x => x.clean),
        templateSlug: destination === "all" ? undefined : destination,
        publishToAll: destination === "all",
        sourceType,
        sourceFilename: sourceType === "pdf-import" ? fileName : undefined,
      });
      if (!result.ok) throw new Error(result.data.error ?? "Publication failed.");
      setTitle(""); setBody(""); setExtracted([]); setFileName("");
      setMessage("Created " + result.data.sourcesCreated + " master source(s) and " + result.data.publications + " simulator publication(s).");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Publication failed."); }
    finally { setBusy(false); }
  };

  const saveEdit = async () => {
    if (!editing || busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await send("/api/admin/passage-studio", editing, "PATCH");
      if (!result.ok) throw new Error(result.data.error ?? "Could not publish new version.");
      setEditing(null);
      setMessage("Published version " + result.data.version + " to " + result.data.republished + " simulator(s). Previous passage versions remain available to historical tests.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save passage."); }
    finally { setBusy(false); }
  };

  const archive = async (source: Source) => {
    if (busy || !confirm("Archive " + source.title + "? It will disappear from active passage lists. Existing test history is retained.")) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await request("/api/admin/passage-studio?id=" + encodeURIComponent(source.id), { method: "DELETE" });
      if (!result.ok) throw new Error(result.data.error ?? "Archive failed.");
      setMessage("Passage archived. Existing test history is preserved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Archive failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const validation = validatePassage({ title, language, body });
  const editingValidation = editing ? validatePassage(editing) : null;

  return (
    <main className="page admin">
      <nav className="admin-management-nav" aria-label="Admin navigation">
        <a href="/admin">Administration</a> · <a href="/admin/users">Users &amp; roles</a> · <a href="/admin/institutions">Institutes</a> · <a href="/admin/payments">Payments</a>
      </nav>
      <header className="admin-generation-panel">
        <span className="hint">TYPINGSKILLZONE · CONTENT OPERATIONS</span>
        <h1>Passage Studio</h1>
        <p className="hint">One master passage repository. Publish once to compatible simulators; each simulator keeps its own presentation and exam configuration.</p>
        <div className="exam-dashboard-metrics">
          <div><span>MASTER PASSAGES</span><strong>{sources.filter(s => !s.archived_at).length}</strong><small>Single source records</small></div>
          <div><span>SIMULATOR PUBLICATIONS</span><strong>{sources.reduce((n, s) => n + Number(s.published_count || 0), 0)}</strong><small>Active destinations</small></div>
          <div><span>ACTIVE SIMULATORS</span><strong>{templates.filter(t => t.is_active).length}</strong><small>Both language streams</small></div>
        </div>
      </header>

      {message && <p className="flash-msg" role="status">{message}</p>}

      <section className="admin-generation-panel">
        <h2>Create a master passage</h2>
        <div className="form">
          <label>Passage title<input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label>
          <label>Language<select value={language} onChange={e => setLanguage(e.target.value as Lang)}><option value="en">English</option><option value="hi">Hindi</option></select></label>
          <label>Publication destination<select value={destination} onChange={e => setDestination(e.target.value)}><option value="all">All active compatible simulators</option>{availableTemplates.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select></label>
          <label>Original passage<textarea rows={9} lang={language} value={body} onChange={e => setBody(e.target.value)} onBlur={() => setBody(cleanBody(body))} /></label>
          <p className="hint">{countWords(body)} words · {body.length} characters</p>
          {validation.errors.map(error => <p className="err" key={error}>{error}</p>)}
          {validation.warnings.map(warning => <p className="warn" key={warning}>{warning}</p>)}
          <button className="go" disabled={!validation.ok || busy} onClick={() => void publish([{ title, body }], "manual")}>{busy ? "Publishing…" : "Create and publish passage"}</button>
        </div>
      </section>

      <section className="admin-generation-panel">
        <h2>Import a passage collection</h2>
        <p className="hint">Upload a selectable-text PDF (one passage per page) or a UTF-8 TXT collection. In TXT files, separate passages with a line containing --- and optionally start each passage with # Title. Review and edit every imported passage before publication. Scanned PDFs require OCR before import.</p>
        <label>Passage file (PDF or TXT)<input type="file" accept="application/pdf,.pdf,text/plain,.txt" disabled={busy} onChange={e => { void importFile(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
        {fileName && <p className="hint">Source file: {fileName}</p>}
        {extracted.length > 0 && <>
          <h3>Import preview · {extracted.length} passages</h3>
          <div className="passage-import-review">
            {extracted.map((item, index) => {
              const checked = validatePassage({ ...item, language });
              return <article className="passage-import-card" key={index}>
                <header><strong>Passage {String(index + 1).padStart(2, "0")}</strong><span>{countWords(item.body)} words · {item.body.length} characters</span></header>
                <label>Passage title<input value={item.title} maxLength={120} onChange={e => updateExtracted(index, { title: e.target.value })} /></label>
                <label>Passage text<textarea rows={5} lang={language} value={item.body} onChange={e => updateExtracted(index, { body: e.target.value })} onBlur={() => updateExtracted(index, { body: cleanBody(item.body) })} /></label>
                {checked.errors.map(error => <p className="err" key={error}>{error}</p>)}
                {checked.warnings.map(warning => <p className="warn" key={warning}>{warning}</p>)}
                {checked.ok && <p className="passage-import-ready">Ready to publish</p>}
              </article>;
            })}
          </div>
          <button className="go" disabled={busy || extracted.some(item => !validatePassage({ ...item, language }).ok)} onClick={() => void publish(extracted, "pdf-import")}>{busy ? "Publishing…" : "Publish all " + extracted.length + " passages"}</button>
        </>}
      </section>

      <section className="admin-generation-panel">
        <div className="exam-workspace-section-heading">
          <div><h2>Master repository</h2><p className="hint">Edit a source to create a new version. Published simulator copies are refreshed without changing passages attached to historical tests.</p></div>
          <button type="button" onClick={() => setShowArchived(v => !v)}>{showArchived ? "Hide archived" : "Show archived"}</button>
        </div>
        <div className="passage-repository-toolbar">
          <input aria-label="Search master passages" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, content or source ID…" />
          <select aria-label="Filter passages by language" value={repositoryLanguage} onChange={e => setRepositoryLanguage(e.target.value as "all" | Lang)}>
            <option value="all">All languages</option><option value="en">English</option><option value="hi">Hindi</option>
          </select>
          <select aria-label="Filter by simulator destination" value={repositoryDestination} onChange={e => setRepositoryDestination(e.target.value)}>
            <option value="all">All simulator destinations</option>
            {templates.map(template => <option key={template.slug} value={template.slug}>{template.name}</option>)}
          </select>
        </div>
        <div className="passage-repository-summary" aria-live="polite">
          <span><strong>{filtered.length}</strong> matching records</span>
          <span><strong>{repositoryStats.english}</strong> active English</span>
          <span><strong>{repositoryStats.hindi}</strong> active Hindi</span>
          <span><strong>{repositoryStats.unpublished}</strong> without publication</span>
          <span><strong>{repositoryStats.archived}</strong> archived</span>
        </div>
        {loading ? <p>Loading repository…</p> : <div className="tbl"><table><thead><tr><th>Passage ID</th><th>Master passage</th><th>Language</th><th>Words</th><th>Version</th><th>Distribution</th><th>Actions</th></tr></thead><tbody>
          {filtered.map(source => <tr key={source.id}>
            <td><code>{String(source.visible_number).padStart(2, "0")}</code></td>
            <td><strong>{source.title}</strong><small>{source.source_type} · {new Date(source.created_at).toLocaleDateString()}</small></td>
            <td>{source.language === "hi" ? "Hindi" : "English"}</td>
            <td>{source.word_count}</td>
            <td>v{source.version}</td>
            <td>
              <strong>{source.published_count}/{source.distribution_count} published</strong>
              <small>{source.distributions.length ? source.distributions.map(item => item.name + " · " + item.status).join(" | ") : "No simulator destinations"}</small>
            </td>
            <td><div className="admin-row-actions">
              {!source.archived_at && <button type="button" onClick={() => setEditing(source)}>Edit</button>}
              {!source.archived_at && <button type="button" className="danger" onClick={() => void archive(source)}>Archive</button>}
              {source.archived_at && <span className="hint">Archived</span>}
            </div></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan={7}>No master passages found.</td></tr>}
        </tbody></table></div>}
      </section>

      {editing && <div className="admin-preview-overlay" role="dialog" aria-modal="true" aria-label="Edit master passage"><section className="admin-preview-dialog">
        <header><div><span>MASTER PASSAGE · NEW VERSION</span><h3>Edit source passage</h3><small>Version {editing.version} → {editing.version + 1}</small></div><button type="button" onClick={() => setEditing(null)}>Close ×</button></header>
        <label>Title<input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></label>
        <label>Language<select value={editing.language} onChange={e => setEditing({ ...editing, language: e.target.value as Lang })}><option value="en">English</option><option value="hi">Hindi</option></select></label>
        <label>Passage text<textarea rows={14} lang={editing.language} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} /></label>
        <p className="hint">{countWords(editing.body)} words · {editing.distribution_count} simulator destinations</p>
        {editingValidation?.errors.map(error => <p className="err" key={error}>{error}</p>)}
        <footer><button type="button" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="go" disabled={busy || !editingValidation?.ok} onClick={() => void saveEdit()}>{busy ? "Publishing…" : "Save and publish new version"}</button></footer>
      </section></div>}
    </main>
  );
}
