"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanBody, countWords, defaultScoring, parseBulk, validatePassage } from "@/lib/adminValidation";
import { PROFILES, type Lang } from "@/lib/wpmCalculator";
import { PRESETS } from "@/lib/presets";

type Tpl = { slug: string; name: string; language: Lang; duration_sec: number; display_mode: string; backspace: string; scoring: any; is_active: boolean; passage_layout?: string; font_size_pt?: number; passage_font_family?: string; passage_alignment?: string; passage_line_spacing?: number; passage_paragraph_spacing?: number; print_page_size?: string };
type Row = { id: string; title: string; language: Lang; word_count: number; preview: string; template: string | null; template_name: string; passage_layout: string; font_size_pt: number; passage_number: number; created_at?: string };

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
const post = (url: string, body: unknown) => api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const emptyTpl = { slug: "", name: "", language: "en" as Lang, minutes: 10, displayMode: "highlighted", backspace: "full", base: "practice", unit: "words", netMethod: "penalty", qualifying: "", maxErr: "", caseOnly: true, punctOnly: true, passageLayout: "continuous", fontSizePt: 12, passageFontFamily: "system", passageAlignment: "left", passageLineSpacing: 1.5, passageParagraphSpacing: 8, printPageSize: "A4" };

export default function Admin() {
  const [tab, setTab] = useState<"passages" | "templates">("templates");
  const [denied, setDenied] = useState(false);
  const [msg, setMsg] = useState("");
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [generationBusy, setGenerationBusy] = useState("");
  const [generationMsg, setGenerationMsg] = useState("");
  const [savingPassages, setSavingPassages] = useState(false);
  const [folder, setFolder] = useState("all");
  const [selectedPassageIds, setSelectedPassageIds] = useState<string[]>([]);
  const [deletingPassages, setDeletingPassages] = useState(false);
  const [passageQuery, setPassageQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<"all" | Lang>("all");
  const [previewPassage, setPreviewPassage] = useState<{ id: string; title: string; body: string; language: Lang } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const runGeneration = async (slot: "morning" | "afternoon" | "live") => {
    const label = slot === "morning" ? "7 AM batch (5 passages)" : slot === "afternoon" ? "1 PM batch (5 passages)" : "7 PM live batch (2 passages)";
    if (!confirm(`Generate ${label} for ${selectedExamSlug || "the selected simulator"}? This uses the configured AI provider and saves passages only to that simulator folder.`)) return;
    setGenerationBusy(slot); setGenerationMsg("");
    try {
      const r = await post("/api/admin/passages/generate", { slot, templateSlug: selectedExamSlug });
      if (!r.ok) setGenerationMsg(r.data.error ?? "Generation failed. Check provider configuration and database migration.");
      else { setGenerationMsg(`Generated ${r.data.generatedThisRun ?? 0} this run; ${r.data.generatedTotal ?? 0} total for ${r.data.date} (${slot}). ${r.data.failures?.length ? r.data.failures.join(" · ") : "Generation complete."}`); await load(); }
    } catch { setGenerationMsg("Network error while generating passages."); }
    finally { setGenerationBusy(""); }
  };

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api("/api/admin/templates"), api("/api/admin/passages")]);
    if (a.status === 403 || b.status === 403 || a.status === 500) { setDenied(true); return; }
    setTpls(a.data); setRows(b.data);
    setSelectedExamSlug((current) => current && a.data.some((x: Tpl) => x.slug === current && x.is_active) ? current : (a.data.find((x: Tpl) => x.language === "en" && x.is_active)?.slug ?? ""));
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ---------- passages ---------- */
  const [title, setTitle] = useState(""); const [lang, setLang] = useState<Lang>("en"); const [body, setBody] = useState(""); const [selectedExamSlug, setSelectedExamSlug] = useState("");
  useEffect(() => { if (tpls.length && !tpls.some((x) => x.slug === selectedExamSlug && x.is_active)) setSelectedExamSlug(tpls.find((x) => x.language === lang && x.is_active)?.slug ?? ""); }, [tpls, selectedExamSlug, lang]);
  const check = useMemo(() => validatePassage({ title, language: lang, body }), [title, lang, body]);
  const [bulk, setBulk] = useState<{ title: string; body: string }[]>([]);
  const [publishToAll, setPublishToAll] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfName, setPdfName] = useState("");
  const bulkChecks = useMemo(() => bulk.map((b) => validatePassage({ ...b, language: lang })), [bulk, lang]);

  const savePassages = async (items: { title: string; language: Lang; body: string }[], allMatching = false) => {
    if (savingPassages || !items.length) return;
    setSavingPassages(true);
    let saved = 0;
    let remaining = [...items];
    try {
      // Keep each request small enough to avoid edge/runtime 413 body-size limits.
      const maxChunkBytes = 24 * 1024;
      const chunks: typeof items[] = [];
      let chunk: typeof items = [];
      for (const item of items) {
        const candidate = [...chunk, item];
        const bytes = new TextEncoder().encode(JSON.stringify({ items: candidate, templateSlug: selectedExamSlug })).byteLength;
        if (chunk.length && (bytes > maxChunkBytes || candidate.length > 10)) {
          chunks.push(chunk);
          chunk = [item];
        } else {
          chunk = candidate;
        }
      }
      if (chunk.length) chunks.push(chunk);

      for (let index = 0; index < chunks.length; index++) {
        const batch = chunks[index];
        setMsg(`Saving passages: ${saved} of ${items.length} complete (batch ${index + 1}/${chunks.length})…`);
        const r = await post("/api/admin/passages", { items: batch, templateSlug: selectedExamSlug, publishToAll: allMatching });
        if (!r.ok || Number(r.data.saved) !== batch.length) {
          const details = Array.isArray(r.data.problems)
            ? r.data.problems.map((p: any) => `Passage ${p.index + 1}: ${(p.errors ?? []).join(" ")}`).join(" | ")
            : r.data.error ?? `Save failed (HTTP ${r.status}).`;
          if (bulk.length) setBulk(remaining.map(({ title, body }) => ({ title, body })));
          setMsg(`${saved} of ${items.length} passages saved. Remaining passages are still loaded below. ${details}`);
          await load();
          return;
        }
        saved += batch.length;
        remaining = items.slice(saved);
        if (bulk.length) setBulk(remaining.map(({ title, body }) => ({ title, body })));
      }

      setMsg(`Successfully published ${saved} passage(s)${allMatching ? " to all active matching-language simulators" : ""}.`);
      setTitle(""); setBody(""); setBulk([]);
      await load();
    } catch (error) {
      if (bulk.length) setBulk(remaining.map(({ title, body }) => ({ title, body })));
      setMsg(`${saved} of ${items.length} passages saved. Remaining passages are still loaded below. ${error instanceof Error ? error.message : "Network error; refresh the list before retrying."}`);
      await load();
    } finally {
      setSavingPassages(false);
    }
  };
  const onFile = async (f?: File) => { if (f) setBulk(parseBulk(await f.text())); };
  const onPdfFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMsg("Choose a PDF file."); return;
    }
    if (file.size > 20 * 1024 * 1024) { setMsg("PDF must be 20 MB or smaller."); return; }
    setPdfBusy(true); setMsg(""); setBulk([]); setPdfName(file.name);
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const task = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
      const pdf = await task.promise;
      if (pdf.numPages > 200) throw new Error("PDF has more than 200 pages. Split it into smaller monthly files.");
      const extracted: { title: string; body: string }[] = [];
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        let previousY: number | null = null;
        const pageText = content.items.map((item: any) => {
          if (typeof item.str !== "string" || !item.str.trim()) return "";
          const y = Array.isArray(item.transform) ? Number(item.transform[5]) : null;
          const lineBreak = previousY !== null && y !== null && Math.abs(previousY - y) > 2.5;
          if (y !== null) previousY = y;
          return (lineBreak ? "\n" : " ") + item.str;
        }).join("");
        const text = cleanBody(pageText);
        if (!text || countWords(text) < 30) continue;
        extracted.push({ title: `Passage ${String(extracted.length + 1).padStart(2, "0")}`, body: text });
      }
      if (!extracted.length) throw new Error("No selectable passage text was found. This PDF may be scanned; OCR is not included.");
      setBulk(extracted);
      setMsg(`Extracted ${extracted.length} passage(s) from ${pdf.numPages} PDF pages. Review the preview, then publish.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not extract text from this PDF.");
    } finally { setPdfBusy(false); }
  };
  const folderRows = rows.filter((row) =>
    (folder === "all" || (row.template ?? "general") === folder) &&
    (languageFilter === "all" || row.language === languageFilter) &&
    (!passageQuery.trim() || row.title.toLowerCase().includes(passageQuery.trim().toLowerCase()) || row.id.toLowerCase().includes(passageQuery.trim().toLowerCase()) || String(row.passage_number).includes(passageQuery.trim()))
  );
  const folderOptions = [...tpls.map((item) => ({ slug: item.slug, name: item.name, count: rows.filter((row) => row.template === item.slug).length })), ...(rows.some((row) => !row.template) ? [{ slug: "general", name: "General library", count: rows.filter((row) => !row.template).length }] : [])];
  const togglePassage = (id: string, checked: boolean) => setSelectedPassageIds((current) => checked ? [...new Set([...current, id])] : current.filter((x) => x !== id));
  const openPassagePreview = async (row: Row) => {
    setPreviewBusy(true);
    try {
      const result = await api(`/api/library?id=${encodeURIComponent(row.id)}`);
      if (!result.ok) throw new Error(result.data.error ?? "Unable to load passage.");
      setPreviewPassage({ id: row.id, title: row.title, body: result.data.body ?? "", language: row.language });
    } catch (error) { setMsg(error instanceof Error ? error.message : "Unable to load passage."); }
    finally { setPreviewBusy(false); }
  };
  const bulkDeletePassages = async () => {
    const ids = selectedPassageIds.filter((id) => folderRows.some((row) => row.id === id));
    if (!ids.length || !confirm(`Delete ${ids.length} selected passage(s)? Passages linked to test history will be protected.`)) return;
    setDeletingPassages(true);
    const result = await api("/api/admin/passages?ids=" + encodeURIComponent(ids.join(",")), { method: "DELETE" });
    setMsg(result.ok ? `Deleted ${result.data.deleted} passage(s).` : result.data.error ?? "Bulk delete failed.");
    setSelectedPassageIds([]);
    setDeletingPassages(false);
    await load();
  };
  const delPassage = async (id: string) => {
    if (!confirm("Delete this passage?")) return;
    const result = await api(`/api/admin/passages?id=${id}`, { method: "DELETE" });
    setMsg(result.ok ? "Passage deleted." : result.data.error ?? "Could not delete passage.");
    await load();
  };

  /* ---------- templates ---------- */
  const [t, setT] = useState(emptyTpl);
  const upd = (k: keyof typeof emptyTpl, v: any) => setT((x) => ({ ...x, [k]: v }));
  const selectedProfile = PROFILES[t.base] ?? PROFILES.practice;
  const saveTpl = async () => {
    const scoring = { ...defaultScoring(t.base), id: t.slug, label: t.name, unit: t.unit, netMethod: t.netMethod, halfRules: { caseOnly: t.caseOnly, punctuationOnly: t.punctOnly }, qualifyingWpm: t.qualifying === "" ? undefined : Number(t.qualifying), maxErrorPercent: t.maxErr === "" ? undefined : Number(t.maxErr) };
    const r = await post("/api/admin/templates", { slug: t.slug.trim(), name: t.name, language: t.language, durationSec: Math.round(t.minutes * 60), displayMode: t.displayMode, backspace: t.backspace, scoring, passageLayout: t.passageLayout, fontSizePt: t.fontSizePt, passageFontFamily: t.passageFontFamily, passageAlignment: t.passageAlignment, passageLineSpacing: t.passageLineSpacing, passageParagraphSpacing: t.passageParagraphSpacing, printPageSize: t.printPageSize });
    setMsg(r.ok ? "Template saved." : r.data.error ?? "Could not save."); if (r.ok) { setT(emptyTpl); load(); }
  };
  const editTpl = (x: Tpl) => setT({ slug: x.slug, name: x.name, language: x.language, minutes: x.duration_sec / 60, displayMode: x.display_mode, backspace: x.backspace, base: (PROFILES[x.scoring.id] ? x.scoring.id : "practice"), unit: x.scoring.unit, netMethod: x.scoring.netMethod, qualifying: x.scoring.qualifyingWpm?.toString() ?? "", maxErr: x.scoring.maxErrorPercent?.toString() ?? "", caseOnly: !!x.scoring.halfRules?.caseOnly, punctOnly: !!x.scoring.halfRules?.punctuationOnly, passageLayout: x.passage_layout ?? "continuous", fontSizePt: Number(x.font_size_pt ?? 12), passageFontFamily: x.passage_font_family ?? "system", passageAlignment: x.passage_alignment ?? "left", passageLineSpacing: Number(x.passage_line_spacing ?? 1.5), passageParagraphSpacing: Number(x.passage_paragraph_spacing ?? 8), printPageSize: x.print_page_size ?? "A4" });
  const delTpl = async (slug: string) => { if (confirm(`Delete template ${slug}? Passages stay but lose the link.`)) { await api(`/api/admin/templates?slug=${slug}`, { method: "DELETE" }); load(); } };

  if (denied) return <div className="page"><h1>Admin</h1><p>Admin access is required. Sign in with an admin account (users.role = &apos;admin&apos;).</p></div>;

  return (
    <div className="page admin">
      <h1>Admin</h1>
      <nav className="admin-management-nav" aria-label="Administration"><a href="/admin/users">Users &amp; roles</a> · <a href="/admin/institutions">Institutes</a> · <a href="/admin/subscribers">Subscriptions</a> · <a href="/admin/payments">Payments</a> · <a href="/admin/passage-studio">Passage Studio</a> · <a href="/admin">Simulator settings</a></nav>
      <section className="admin-generation-panel">
        <h2>Daily Passage Automation</h2>
        <p className="hint">Generate passages for one selected simulator at a time. Each generated passage is saved directly into that simulator folder and uses its language.</p>
        <div className="cta-group">
          <button className="go" disabled={!!generationBusy} onClick={() => runGeneration("morning")}>{generationBusy === "morning" ? "Generating…" : "Generate 7 AM · 5 passages"}</button>
          <button className="go" disabled={!!generationBusy} onClick={() => runGeneration("afternoon")}>{generationBusy === "afternoon" ? "Generating…" : "Generate 1 PM · 5 passages"}</button>
          <button className="go" disabled={!!generationBusy} onClick={() => runGeneration("live")}>{generationBusy === "live" ? "Generating…" : "Generate 7 PM · 2 live sets"}</button>
        </div>
        {generationMsg && <p className="flash-msg" role="status">{generationMsg}</p>}
        <p className="hint">Automatic schedule requires the additive SQL migrations plus the same strong PASSAGE_CRON_SECRET configured in both GitHub Actions secrets and Cloudflare Worker secrets.</p>
      </section>
      <div className="tabs" role="tablist">
        <a role="tab" aria-selected={false} href="/admin/passage-studio">Passage Studio</a>
        <button role="tab" aria-selected={tab === "templates"} onClick={() => setTab("templates")}>Exam templates</button>
      </div>
      {msg && <p className="flash-msg" role="status">{msg}</p>}

      {tab === "passages" ? (
        <>
          <h2>Add a passage</h2>
          <div className="form">
            <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
            <label>Language<select value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="en">English</option><option value="hi">Hindi</option></select></label>
            <label>Destination simulator <select value={selectedExamSlug} onChange={(e) => setSelectedExamSlug(e.target.value)}>{tpls.filter(x => x.language === lang && x.is_active).map(x => <option key={x.slug} value={x.slug}>{x.name} · {x.slug}</option>)}</select><small className="hint">This upload is saved only in the selected simulator folder. Change the destination to publish a separate exam-specific copy.</small></label>
            <label>Passage text<textarea rows={8} lang={lang} value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => setBody(cleanBody(body))} /></label>
            <p className="hint">{countWords(body)} words</p>
            {check.errors.map((e) => <p key={e} className="err">{e}</p>)}
            {check.warnings.map((e) => <p key={e} className="warn">{e}</p>)}
            <button className="go" disabled={!check.ok} onClick={() => savePassages([check.clean])}>Save passage</button>
          </div>

          <section className="admin-generation-panel">
            <h2>Upload one RKC-style monthly PDF</h2>
            <p className="hint">Upload a text-based PDF with one complete passage per page. Each page becomes one passage. Scanned image-only PDFs require OCR and are not supported by this extractor.</p>
            <label>PDF language <select value={lang} onChange={e => setLang(e.target.value as Lang)}><option value="en">English</option><option value="hi">Hindi</option></select></label>
            <label>PDF file <input type="file" accept="application/pdf,.pdf" disabled={pdfBusy || savingPassages} onChange={e => void onPdfFile(e.target.files?.[0])} /></label>
            {pdfName && <p className="hint">Selected: {pdfName}</p>}
            <label><input type="checkbox" checked={publishToAll} onChange={e => setPublishToAll(e.target.checked)} /> Publish automatically to every active simulator with this language</label>
            <p className="hint">Each simulator receives its own passage copy. Its own RKC-referenced layout is applied at display time. Exam rules and scoring are not changed.</p>
            {pdfBusy && <p role="status">Extracting PDF pages…</p>}
            {bulk.length > 0 && <><p>{bulk.length} passages extracted · {bulkChecks.filter(c => c.ok).length} valid · {bulkChecks.filter(c => !c.ok).length} need review</p><ol>{bulkChecks.slice(0, 12).map((c, i) => <li key={i}>{String(i + 1).padStart(2, "0")} · {c.clean.title} · {countWords(c.clean.body)} words {c.ok ? "✓" : c.errors.join(" ")}</li>)}</ol>{bulk.length > 12 && <p className="hint">Showing first 12 passages.</p>}<button className="go" disabled={pdfBusy || savingPassages || bulkChecks.some(c => !c.ok)} onClick={() => void savePassages(bulkChecks.map(c => ({ ...c.clean, language: lang })), publishToAll)}>{savingPassages ? "Publishing…" : `Publish ${bulk.length} passages ${publishToAll ? "to all matching simulators" : "to selected simulator"}`}</button></>}
          </section>

          <h2>Upload many at once</h2>
          <p className="hint">Use a UTF-8 .txt file. Separate passages with a line containing only ---. Start a passage with “# Title” to name it. Language and selected exam directories above apply to all.</p>
          <input type="file" accept=".txt,text/plain" disabled={savingPassages} onChange={(e) => { setMsg(""); void onFile(e.target.files?.[0]).catch((error) => setMsg(error instanceof Error ? error.message : "Could not read this TXT file.")); }} aria-label="Upload passages file" />
          {bulk.length > 0 && (<>
            <p>{bulk.length} passages found, {bulkChecks.filter((c) => c.ok).length} valid.</p>
            <ul>{bulkChecks.map((c, i) => <li key={i}>{c.clean.title}: {c.ok ? "ready" : <span className="err">{c.errors.join(" ")}</span>}</li>)}</ul>
            <button className="go" disabled={savingPassages || bulkChecks.some((c) => !c.ok)} onClick={() => savePassages(bulkChecks.map((c) => c.clean))}>{savingPassages ? "Saving passages…" : `Save all ${bulk.length} passages`}</button>
          </>)}

          <section className="admin-passage-library">
            <div className="admin-library-heading"><div><h2>Passage folders</h2><p className="hint">Each simulator has its own folder. A passage published to multiple simulators appears separately in each selected folder.</p></div><strong>{rows.length} total records</strong></div>
            <div className="admin-folder-toolbar">
              <label className="admin-filter-field">Simulator folder
                <select value={folder} onChange={(e) => { setFolder(e.target.value); setSelectedPassageIds([]); }}>
                  <option value="all">All simulator folders</option>
                  {folderOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name} ({item.count})</option>)}
                </select>
              </label>
              <label className="admin-filter-field">Language
                <select value={languageFilter} onChange={(e) => { setLanguageFilter(e.target.value as "all" | Lang); setSelectedPassageIds([]); }}>
                  <option value="all">All languages</option><option value="en">English</option><option value="hi">Hindi</option>
                </select>
              </label>
              <label className="admin-search-field">Search title or passage ID
                <input value={passageQuery} onChange={(e) => setPassageQuery(e.target.value)} placeholder="Search passages…" />
              </label>
              <div className="admin-folder-actions">
                <span>{folderRows.length} shown · {selectedPassageIds.filter((id) => folderRows.some((row) => row.id === id)).length} selected</span>
                <button type="button" onClick={() => setSelectedPassageIds(folderRows.map((row) => row.id))}>Select visible</button>
                <button type="button" onClick={() => setSelectedPassageIds([])}>Clear</button>
                <button type="button" className="danger" disabled={!selectedPassageIds.some((id) => folderRows.some((row) => row.id === id)) || deletingPassages} onClick={() => void bulkDeletePassages()}>{deletingPassages ? "Deleting…" : "Delete selected"}</button>
              </div>
            </div>
            <div className="tbl"><table><thead><tr><th><input aria-label="Select all visible passages" type="checkbox" checked={folderRows.length > 0 && folderRows.every((row) => selectedPassageIds.includes(row.id))} onChange={(e) => setSelectedPassageIds(e.target.checked ? [...new Set([...selectedPassageIds, ...folderRows.map((row) => row.id)])] : selectedPassageIds.filter((id) => !folderRows.some((row) => row.id === id)))} /></th><th>Passage ID</th><th>Title</th><th>Language</th><th>Words</th><th>Exam format</th><th>Action</th></tr></thead><tbody>
              {folderRows.map((r) => <tr key={r.id}><td><input type="checkbox" aria-label={`Select ${r.title}`} checked={selectedPassageIds.includes(r.id)} onChange={(e) => togglePassage(r.id, e.target.checked)} /></td><td><code>Passage {String(r.passage_number).padStart(2, "0")}</code></td><td title={r.preview}>{r.title}</td><td>{r.language === "hi" ? "Hindi" : "English"}</td><td>{r.word_count}</td><td>{r.passage_layout === "continuous" ? "Continuous" : "Paragraph layout"} · {Number(r.font_size_pt || 12)}pt</td><td><div className="admin-row-actions"><button type="button" disabled={previewBusy} onClick={() => void openPassagePreview(r)}>{previewBusy ? "Loading…" : "View"}</button><button type="button" className="danger" onClick={() => delPassage(r.id)}>Delete</button></div></td></tr>)}
              {!folderRows.length && <tr><td colSpan={7}>This folder is empty. Upload or generate passages and assign them to this simulator.</td></tr>}
            </tbody></table></div>
                      {previewPassage && <div className="admin-preview-overlay" role="dialog" aria-modal="true" aria-label="Passage preview"><section className="admin-preview-dialog"><header><div><span>PASSAGE PREVIEW</span><h3>{previewPassage.title}</h3><small>{previewPassage.language === "hi" ? "Hindi" : "English"} · ID {previewPassage.id}</small></div><button type="button" onClick={() => setPreviewPassage(null)}>Close ×</button></header><pre lang={previewPassage.language}>{previewPassage.body}</pre><footer><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(previewPassage.body); setMsg("Passage text copied."); } catch { setMsg("Clipboard access is unavailable in this browser."); } }}>Copy passage text</button><button type="button" onClick={() => setPreviewPassage(null)}>Done</button></footer></section></div>}
          </section>
        </>
      ) : (
        <>
          <h2>{t.slug && tpls.some((x) => x.slug === t.slug) ? "Edit template" : "New template"}</h2>
          <div className="form">
            <label>Name<input value={t.name} onChange={(e) => upd("name", e.target.value)} placeholder="SSC CGL Typing" /></label>
            <label>Slug (short web name; same slug updates that template)<input value={t.slug} onChange={(e) => upd("slug", e.target.value.toLowerCase())} placeholder="ssc-cgl" /></label>
            <label>Language<select value={t.language} onChange={(e) => upd("language", e.target.value)}><option value="en">English</option><option value="hi">Hindi</option></select></label>
            <label>Duration (minutes)<input type="number" min={0.5} max={60} step={0.5} value={t.minutes} onChange={(e) => upd("minutes", Number(e.target.value))} /></label>
            <label>Passage display<select value={t.displayMode} onChange={(e) => upd("displayMode", e.target.value)}><option value="highlighted">Highlighted</option><option value="unhighlighted">Unhighlighted</option><option value="offscreen">Paper to screen</option></select></label>
            <label>Backspace<select value={t.backspace} onChange={(e) => upd("backspace", e.target.value)}><option value="full">Full</option><option value="word">Current word only</option><option value="disabled">Disabled</option></select></label>
            <h3>Passage presentation profile</h3>
            <p className="hint">These settings change only how passage text is displayed and printed. They do not change test timing, scoring or keyboard rules.</p>
            <label>Passage layout<select value={t.passageLayout} onChange={(e) => upd("passageLayout", e.target.value)}><option value="continuous">Continuous text</option><option value="paragraph-tab">Paragraphs with source spacing</option><option value="source-preserved">Preserve source line breaks</option></select></label>
            <label>Font size (pt)<input type="number" min="8" max="24" step="0.5" value={t.fontSizePt} onChange={(e) => upd("fontSizePt", Number(e.target.value))} /></label>
            <label>Font family<select value={t.passageFontFamily} onChange={(e) => upd("passageFontFamily", e.target.value)}><option value="system">System sans-serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
            <label>Text alignment<select value={t.passageAlignment} onChange={(e) => upd("passageAlignment", e.target.value)}><option value="left">Left</option><option value="justify">Justified</option><option value="center">Center</option></select></label>
            <label>Line spacing<input type="number" min="1.1" max="2.5" step="0.1" value={t.passageLineSpacing} onChange={(e) => upd("passageLineSpacing", Number(e.target.value))} /></label>
            <label>Paragraph spacing (px)<input type="number" min="0" max="32" step="1" value={t.passageParagraphSpacing} onChange={(e) => upd("passageParagraphSpacing", Number(e.target.value))} /></label>
            <label>Print page size<select value={t.printPageSize} onChange={(e) => upd("printPageSize", e.target.value)}><option value="A4">A4</option><option value="Letter">Letter</option><option value="Legal">Legal</option></select></label>
            <label>Start scoring from<select value={t.base} onChange={(e) => { const p = PROFILES[e.target.value]; setT({ ...t, base: e.target.value, unit: p.unit, netMethod: p.netMethod, qualifying: p.qualifyingWpm?.toString() ?? "", maxErr: p.maxErrorPercent?.toString() ?? "", minutes: p.durationSec ? p.durationSec / 60 : t.minutes, language: p.language ?? t.language, displayMode: p.id.startsWith("delhi-police-hcm-") ? "offscreen" : t.displayMode }); }}>{Object.values(PROFILES).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
            <label>Count speed by<select value={t.unit} onChange={(e) => upd("unit", e.target.value)}><option value="words">Words (5 characters = 1 word)</option><option value="keystrokes">Key depressions</option></select></label>
            <label>Net speed<select value={t.netMethod} onChange={(e) => upd("netMethod", e.target.value)}><option value="penalty">Gross minus error penalty</option><option value="accuracy">Gross times accuracy</option><option value="per-error">One WPM per error (DP HCM)</option><option value="rrb">RRB CBTST error-adjusted formula</option></select></label>
            <label>Qualifying WPM (profile gross/net rule applies; blank for none)<input inputMode="decimal" value={t.qualifying} onChange={(e) => upd("qualifying", e.target.value)} /></label>
            <label>Maximum error % (blank for none)<input inputMode="decimal" value={t.maxErr} onChange={(e) => upd("maxErr", e.target.value)} /></label>
            <label className="chk"><input type="checkbox" checked={t.caseOnly} onChange={(e) => upd("caseOnly", e.target.checked)} /> Capital-letter slips are half mistakes</label>
            <label className="chk"><input type="checkbox" checked={t.punctOnly} onChange={(e) => upd("punctOnly", e.target.checked)} /> Punctuation slips are half mistakes</label>
            <p className="hint">{selectedProfile.durationSec ? `Profile default: ${selectedProfile.durationSec / 60} minutes. ` : ""}{selectedProfile.targetKeystrokes ? `Practice target: ${selectedProfile.targetKeystrokes.toLocaleString()} key depressions. ` : ""}{selectedProfile.minWords ? `Minimum words: ${selectedProfile.minWords}. ` : ""}{selectedProfile.errorAllowancePercent !== undefined ? `Ignored-error allowance: ${selectedProfile.errorAllowancePercent}%. ` : ""}Check all values against the exam’s current official notification before publishing.</p>
            <button className="go" disabled={!t.name.trim() || !t.slug.trim()} onClick={saveTpl}>Save template</button>
          </div>
          <h2>Saved templates</h2>
          <div className="tbl"><table><thead><tr><th>Name</th><th>Language</th><th>Time</th><th>Display</th><th>Backspace</th><th></th></tr></thead><tbody>
            {tpls.map((x) => <tr key={x.slug}><td>{x.name}</td><td>{x.language === "hi" ? "Hindi" : "English"}</td><td>{x.duration_sec / 60} min</td><td>{x.display_mode}</td><td>{x.backspace}</td><td>{PRESETS.some((p) => p.slug === x.slug) ? <span className="hint">Code-managed</span> : <><button className="link" onClick={() => editTpl(x)}>Edit</button> <button className="link" onClick={() => delTpl(x.slug)}>Delete</button></>}</td></tr>)}
            {!tpls.length && <tr><td colSpan={6}>No templates yet. Students see the built-in presets.</td></tr>}
          </tbody></table></div>
        </>
      )}
    </div>
  );
}
