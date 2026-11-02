"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanBody, countWords, parseBulk, validatePassage, validatePresentationSettings } from "@/lib/adminValidation";
import { formatRkcPassage } from "@/lib/rkc-passage-format";
import type { Lang } from "@/lib/wpmCalculator";

type Template = { slug:string; name:string; language:Lang; is_active:boolean; duration_sec:number; display_mode:"highlighted"|"unhighlighted"|"offscreen"; backspace:"full"|"word"|"disabled"; scoring:unknown; passage_layout:"continuous"|"paragraph-tab"|"source-preserved"|null; font_size_pt:number|null; passage_font_family:"system"|"serif"|"mono"|null; passage_alignment:"left"|"center"|"justify"|null; passage_line_spacing:number|null; passage_paragraph_spacing:number|null; print_page_size:"A4"|"Letter"|"Legal"|null };
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
  const [templateLoadError, setTemplateLoadError] = useState("");
  const [repositoryLoadError, setRepositoryLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3 | 4>(1);
  const [uploadMode, setUploadMode] = useState<"file" | "paste" | "manual">("file");
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<Lang>("en");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [destinationGroup, setDestinationGroup] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracted, setExtracted] = useState<{ title: string; body: string }[]>([]);
  const [query, setQuery] = useState("");
  const [repositoryLanguage, setRepositoryLanguage] = useState<"all" | Lang>("all");
  const [repositoryDestination, setRepositoryDestination] = useState("all");
  const [editing, setEditing] = useState<Source | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formatSlug,setFormatSlug]=useState("");
  const [formatSettings,setFormatSettings]=useState({passageLayout:"source-preserved" as "continuous"|"paragraph-tab"|"source-preserved",fontSizePt:12,passageFontFamily:"system" as "system"|"serif"|"mono",passageAlignment:"left" as "left"|"center"|"justify",passageLineSpacing:1.5,passageParagraphSpacing:8,printPageSize:"A4" as "A4"|"Letter"|"Legal"});

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setTemplateLoadError("");
    setRepositoryLoadError("");
    try {
      // Load exam templates independently: a missing passage repository migration
      // must not hide the exam-format groups needed to configure a new import.
      const [templateResult, repositoryResult] = await Promise.allSettled([
        request("/api/admin/templates"),
        request("/api/admin/passage-studio" + (showArchived ? "?status=all" : "")),
      ]);

      if (templateResult.status === "fulfilled" && templateResult.value.ok) {
        const rows = Array.isArray(templateResult.value.data) ? templateResult.value.data as Template[] : [];
        setTemplates(rows);
        if (!rows.length) setTemplateLoadError("No exam templates are present in the database. Apply the approved exam catalogue and simulator-formatting migrations, then reload.");
      } else {
        const detail = templateResult.status === "fulfilled" ? templateResult.value.data?.error : "";
        setTemplateLoadError(detail || "Exam templates could not be loaded. Check admin access and the exam_templates schema.");
      }

      if (repositoryResult.status === "fulfilled" && repositoryResult.value.ok) {
        setSources(Array.isArray(repositoryResult.value.data) ? repositoryResult.value.data : []);
      } else {
        setSources([]);
        const detail = repositoryResult.status === "fulfilled" ? repositoryResult.value.data?.error : "";
        setRepositoryLoadError(detail || "The master passage repository could not be loaded. Check the additive passage intelligence migration.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load Passage Studio.");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => { void load(); }, [load]);

  const availableTemplates = templates.filter(t => t.is_active && t.language === language);
  const formatGroups = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; layout: string; display: string; templates: Template[] }>();
    for (const template of availableTemplates) {
      const rawLayout = template.passage_layout ?? "continuous";
      const layout = rawLayout === "paragraphs" ? "paragraph-tab" : rawLayout === "paper-to-screen" ? "source-preserved" : rawLayout;
      const display = template.display_mode;
      const id = layout + "|" + display;
      const layoutLabel = layout === "continuous" ? "Continuous text" : layout === "paragraph-tab" ? "Paragraph / Tab layout" : "Source-preserved layout";
      const displayLabel = display === "offscreen" ? "Paper-to-screen" : display === "unhighlighted" ? "Unhighlighted" : "Highlighted";
      const current = groups.get(id) ?? { id, label: layoutLabel + " · " + displayLabel, layout, display, templates: [] };
      current.templates.push(template); groups.set(id, current);
    }
    return [...groups.values()].sort((a,b) => a.label.localeCompare(b.label));
  }, [availableTemplates]);
  const selectedGroup = formatGroups.find(group => group.id === destinationGroup) ?? null;
  const autoTitle = (selectedGroup?.templates[0]?.slug ?? "PASSAGE").toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_" + (language === "hi" ? "HI" : "EN") + "_" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "_001";
  useEffect(() => { if (!selectedGroup && formatGroups.length) setDestinationGroup(formatGroups[0].id); }, [selectedGroup, formatGroups]);
  const formatTemplate=templates.find(template=>template.slug===formatSlug)??null;
  useEffect(()=>{if(!formatTemplate)return;setFormatSettings({passageLayout:formatTemplate.passage_layout??"source-preserved",fontSizePt:formatTemplate.font_size_pt??12,passageFontFamily:formatTemplate.passage_font_family??"system",passageAlignment:formatTemplate.passage_alignment??"left",passageLineSpacing:formatTemplate.passage_line_spacing??1.5,passageParagraphSpacing:formatTemplate.passage_paragraph_spacing??8,printPageSize:formatTemplate.print_page_size??"A4"});},[formatSlug,formatTemplate?.slug]);
  const saveFormatting=async()=>{if(!formatTemplate||busy)return;setBusy(true);setMessage("");try{const result=await send("/api/admin/templates",{slug:formatTemplate.slug,name:formatTemplate.name,language:formatTemplate.language,durationSec:formatTemplate.duration_sec,displayMode:formatTemplate.display_mode,backspace:formatTemplate.backspace,scoring:formatTemplate.scoring,isActive:formatTemplate.is_active,presentationOnly:true,...formatSettings});if(!result.ok)throw new Error(result.data.error??"Could not save simulator formatting.");setMessage("Presentation settings saved for "+formatTemplate.name+". Exam scoring and key rules were not changed.");await load();}catch(error){setMessage(error instanceof Error?error.message:"Could not save formatting.");}finally{setBusy(false);}};
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
    if (/\.txt$/i.test(file.name) || file.type === "text/plain") {
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
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
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
    if (!selectedGroup || !selectedGroup.templates.length) {
      setMessage("Choose a valid exam-format group for this passage language."); return;
    }
    setBusy(true); setMessage("");
    try {
      const result = await send("/api/admin/passages", {
        items: checked.map((x, index) => ({ ...x.clean, title: (!x.clean.title.trim() || /^passage\s+\d+$/i.test(x.clean.title.trim())) ? ((selectedGroup?.templates[0]?.slug ?? "PASSAGE").toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_" + (language === "hi" ? "HI" : "EN") + "_" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "_" + String(index + 1).padStart(3, "0")) : x.clean.title })),
        templateSlugs: selectedGroup.templates.map(template => template.slug),
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
    <main className="page admin passage-studio-v2">
      <nav className="admin-management-nav" aria-label="Admin navigation">
        <a href="/admin">Administration</a> · <a href="/admin/users">Users &amp; roles</a> · <a href="/admin/institutions">Institutes</a> · <a href="/admin/payments">Payments</a>
      </nav>

      <header className="ps2-header">
        <div><span className="ps2-eyebrow">TYPINGSKILLZONE · CONTENT OPERATIONS</span><h1>Passage Studio</h1><p>Create, import, review and publish passages to compatible typing exams.</p></div>
        <div className="ps2-header-links"><a href="#passage-repository">Passage Library</a><a href="#simulator-formatting">Templates &amp; Formats</a></div>
      </header>

      <div className="ps2-metrics">
        <div><span>MASTER PASSAGES</span><strong>{repositoryLoadError ? "—" : sources.filter(s => !s.archived_at).length}</strong></div>
        <div><span>SIMULATOR PUBLICATIONS</span><strong>{repositoryLoadError ? "—" : sources.reduce((n, s) => n + Number(s.published_count || 0), 0)}</strong></div>
        <div><span>ACTIVE EXAM SIMULATORS</span><strong>{templateLoadError ? "—" : templates.filter(t => t.is_active).length}</strong></div>
        <div><span>ARCHIVED</span><strong>{repositoryLoadError ? "—" : repositoryStats.archived}</strong></div>
      </div>

      {message && <p className="flash-msg ps2-message" role="status">{message}</p>}
      {templateLoadError && <p className="err ps2-message" role="alert">{templateLoadError}</p>}
      {repositoryLoadError && <p className="warn ps2-message" role="status">{repositoryLoadError}</p>}
      {loading && <p className="hint">Loading passage repository and exam formats…</p>}

      <section className="ps2-workflow" aria-label="Passage publishing workflow">
        <div className="ps2-steps">
          {([["Configure","Set exam, format and language"],["Upload","Import passage collection"],["Review","Validate and edit passages"],["Publish","Create and distribute"]] as const).map((item,index) => (
            <button type="button" key={item[0]} className={workflowStep===index+1?"active":workflowStep>index+1?"complete":""} onClick={()=>setWorkflowStep((index+1) as 1|2|3|4)}>
              <span>{index+1}</span><strong>{item[0]}</strong><small>{item[1]}</small>
            </button>
          ))}
        </div>

        {workflowStep===1 && <div className="ps2-config-grid">
          <section className="ps2-panel">
            <h2>1. Configure passage details</h2>
            <div className="ps2-form-grid">
              <label>Passage title / ID <input value={title} maxLength={120} placeholder={autoTitle} onChange={e=>setTitle(e.target.value)} /><small>Leave blank to generate an ID from the selected exam group, language and date.</small></label>
              <label>Language <select value={language} onChange={e=>{setLanguage(e.target.value as Lang);setDestinationGroup("");}}><option value="en">English</option><option value="hi">Hindi</option></select></label>
              <label className="ps2-full">Exam-format group <select value={destinationGroup} onChange={e=>setDestinationGroup(e.target.value)} disabled={!formatGroups.length}><option value="">Choose a compatible format group…</option>{formatGroups.map(group=><option key={group.id} value={group.id}>{group.label} · {group.templates.length} exams</option>)}</select></label>
            </div>
            {selectedGroup ? <div className="ps2-selected-group"><div><strong>{selectedGroup.label}</strong><span>{selectedGroup.templates.length} compatible exam(s) selected automatically</span></div><div className="ps2-exam-chips">{selectedGroup.templates.map(template=><span key={template.slug}>{template.name}</span>)}</div><small>Language: {language==="hi"?"Hindi":"English"} · Display: {selectedGroup.display} · Passage layout: {selectedGroup.layout}</small></div> : <p className="ps2-empty-state">Select a language and format group to see compatible exams. Groups are derived from each simulator's saved formatting settings.</p>}
            <div className="ps2-actions"><button type="button" className="go" disabled={!selectedGroup} onClick={()=>setWorkflowStep(2)}>Continue to upload →</button></div>
          </section>
          <aside className="ps2-panel ps2-guidelines"><h3>Format group rules</h3><ul><li>Only active simulators in the selected language are listed.</li><li>Passages are published to all exams in the selected group.</li><li>Exam-specific scoring, timing and keyboard rules remain unchanged.</li><li>Each exam receives its own simulator passage copy.</li></ul></aside>
        </div>}

        {workflowStep===2 && <section className="ps2-panel">
          <div className="ps2-panel-heading"><div><h2>2. Import passage collection</h2><p>Upload a TXT/PDF file, paste a collection, or enter one passage manually.</p></div><span className="ps2-config-pill">{selectedGroup?.label ?? "No format selected"} · {language==="hi"?"Hindi":"English"}</span></div>
          <div className="ps2-tabs">
            <button type="button" className={uploadMode==="file"?"active":""} onClick={()=>setUploadMode("file")}>Upload file</button>
            <button type="button" className={uploadMode==="paste"?"active":""} onClick={()=>setUploadMode("paste")}>Paste &amp; split</button>
            <button type="button" className={uploadMode==="manual"?"active":""} onClick={()=>setUploadMode("manual")}>Manual entry</button>
          </div>
          {uploadMode==="file" && <div className="ps2-dropzone"><div className="ps2-upload-icon">⇧</div><strong>Choose a TXT or PDF collection</strong><p>PDF: one selectable-text passage per page. TXT: separate passages with a line containing ---.</p><label className="ps2-file-button">Choose file<input type="file" accept="application/pdf,.pdf,text/plain,.txt" disabled={busy} onChange={e=>{void importFile(e.target.files?.[0]);e.currentTarget.value="";}} /></label>{fileName&&<small>Selected: {fileName}</small>}</div>}
          {uploadMode==="paste" && <div className="ps2-manual"><label>Paste passage collection<textarea rows={12} value={body} onChange={e=>setBody(e.target.value)} placeholder={"# Passage title 1\nPaste the complete passage here…\n\n---\n\n# Passage title 2\nPaste the next passage here…"} /></label><button type="button" className="go" disabled={!body.trim()||busy} onClick={()=>{setExtracted(parseBulk(body));setFileName("Pasted collection");setWorkflowStep(3);}}>Split into passages and review →</button></div>}
          {uploadMode==="manual" && <div className="ps2-manual"><label>Passage title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={autoTitle}/></label><label>Passage text<textarea rows={12} lang={language} value={body} onChange={e=>setBody(e.target.value)} onBlur={()=>setBody(cleanBody(body))} /></label><p className="hint">{countWords(body)} words · {body.length} characters · Minimum 30 words</p>{validation.errors.map(error=><p className="err" key={error}>{error}</p>)}<button type="button" className="go" disabled={!validation.ok||busy} onClick={()=>{setExtracted([{title:title.trim()||autoTitle,body:cleanBody(body)}]);setWorkflowStep(3);}}>Review passage →</button></div>}
          {extracted.length>0 && <div className="ps2-import-status"><strong>{extracted.length} passages ready for review</strong><span>{fileName}</span><button type="button" className="go" onClick={()=>setWorkflowStep(3)}>Continue to review →</button></div>}
          <div className="ps2-actions"><button type="button" onClick={()=>setWorkflowStep(1)}>← Back to configure</button></div>
        </section>}

        {workflowStep===3 && <section className="ps2-panel">
          <div className="ps2-panel-heading"><div><h2>3. Review and validate</h2><p>Check every title, language, passage body and word count before publication.</p></div><strong>{extracted.length} passages</strong></div>
          {extracted.length===0 ? <p className="ps2-empty-state">No passages have been imported yet. Return to Upload and select a file or enter text.</p> : <div className="ps2-review-list">{extracted.map((item,index)=>{const checked=validatePassage({...item,language});return <article className="ps2-review-card" key={index}><header><strong>Passage {String(index+1).padStart(2,"0")}</strong><span>{countWords(item.body)} words · {item.body.length} characters</span><span className={checked.ok?"ps2-valid":"ps2-invalid"}>{checked.ok?"Ready":"Needs correction"}</span></header><label>Title / Passage ID<input value={item.title} onChange={e=>updateExtracted(index,{title:e.target.value})}/></label><label>Passage content<textarea rows={6} lang={language} value={item.body} onChange={e=>updateExtracted(index,{body:e.target.value})}/></label>{checked.errors.map(error=><p className="err" key={error}>{error}</p>)}{checked.warnings.map(warning=><p className="warn" key={warning}>{warning}</p>)}</article>;})}</div>}
          <div className="ps2-actions"><button type="button" onClick={()=>setWorkflowStep(2)}>← Back to upload</button><button type="button" className="go" disabled={!extracted.length||extracted.some(item=>!validatePassage({...item,language}).ok)||!selectedGroup} onClick={()=>setWorkflowStep(4)}>Continue to publish →</button></div>
        </section>}

        {workflowStep===4 && <section className="ps2-publish-grid">
          <div className="ps2-panel"><h2>4. Publish passages</h2><p>Review the final destination before creating master records and simulator copies.</p><div className="ps2-publish-summary"><div><span>Passages</span><strong>{extracted.length}</strong></div><div><span>Language</span><strong>{language==="hi"?"Hindi":"English"}</strong></div><div><span>Compatible exams</span><strong>{selectedGroup?.templates.length??0}</strong></div><div><span>Total publications</span><strong>{extracted.length*(selectedGroup?.templates.length??0)}</strong></div></div><h3>{selectedGroup?.label}</h3><div className="ps2-exam-chips">{selectedGroup?.templates.map(template=><span key={template.slug}>{template.name}</span>)}</div><p className="hint">Each passage is saved once in the master repository and distributed to the selected compatible simulators. Existing test history is not overwritten.</p><div className="ps2-actions"><button type="button" onClick={()=>setWorkflowStep(3)}>← Review passages</button><button type="button" className="go" disabled={busy||!extracted.length||!selectedGroup||extracted.some(item=>!validatePassage({...item,language}).ok)} onClick={()=>void publish(extracted,"manual")}>{busy?"Publishing…":"Create &amp; Publish Passages"}</button></div></div>
          <aside className="ps2-panel ps2-guidelines"><h3>Before publishing</h3><ul><li>All passages pass the minimum 30-word validation.</li><li>Language matches the selected exam group.</li><li>Destination list is restricted to active compatible simulators.</li><li>Publishing creates a master source and separate exam copies.</li></ul></aside>
        </section>}
      </section>

      <section className="admin-generation-panel passage-format-studio" id="simulator-formatting">
        <h2>Simulator passage formatting</h2><p className="hint">Formatting remains configurable per simulator. Scoring, duration and keyboard rules are not changed here.</p>
        <label>Choose simulator<select value={formatSlug} onChange={event=>setFormatSlug(event.target.value)}><option value="">Select an exam simulator…</option>{templates.map(t=><option key={t.slug} value={t.slug}>{t.name} · {t.language==="hi"?"Hindi":"English"}</option>)}</select></label>
        {formatTemplate&&<><div className="passage-format-controls">
          <label>Passage layout<select value={formatSettings.passageLayout} onChange={e=>setFormatSettings(v=>({...v,passageLayout:e.target.value as typeof v.passageLayout}))}><option value="continuous">Continuous text</option><option value="paragraph-tab">Paragraph / tab layout</option><option value="source-preserved">Preserve source line breaks</option></select></label>
          <label>Font size (pt)<input type="number" min="8" max="24" step="1" value={formatSettings.fontSizePt} onChange={e=>setFormatSettings(v=>({...v,fontSizePt:Number(e.target.value)}))}/></label>
          <label>Font family<select value={formatSettings.passageFontFamily} onChange={e=>setFormatSettings(v=>({...v,passageFontFamily:e.target.value as typeof v.passageFontFamily}))}><option value="system">System sans</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
          <label>Text alignment<select value={formatSettings.passageAlignment} onChange={e=>setFormatSettings(v=>({...v,passageAlignment:e.target.value as typeof v.passageAlignment}))}><option value="left">Left</option><option value="justify">Justified</option><option value="center">Centered</option></select></label>
          <label>Line spacing<input type="number" min="1.1" max="2.5" step="0.1" value={formatSettings.passageLineSpacing} onChange={e=>setFormatSettings(v=>({...v,passageLineSpacing:Number(e.target.value)}))}/></label>
          <label>Paragraph spacing (pt)<input type="number" min="0" max="32" step="1" value={formatSettings.passageParagraphSpacing} onChange={e=>setFormatSettings(v=>({...v,passageParagraphSpacing:Number(e.target.value)}))}/></label>
          <label>Print page size<select value={formatSettings.printPageSize} onChange={e=>setFormatSettings(v=>({...v,printPageSize:e.target.value as typeof v.printPageSize}))}><option value="A4">A4</option><option value="Letter">Letter</option><option value="Legal">Legal</option></select></label>
        </div><button type="button" className="go" disabled={busy||validatePresentationSettings(formatSettings).length>0} onClick={()=>void saveFormatting()}>{busy?"Saving…":"Save simulator formatting"}</button></>}
      </section>

      <section className="admin-generation-panel" id="passage-repository">
        <div className="exam-workspace-section-heading"><div><h2>Master passage repository</h2><p className="hint">Edit creates a new source version. Archive preserves existing test history.</p></div><button type="button" onClick={()=>setShowArchived(v=>!v)}>{showArchived?"Hide archived":"Show archived"}</button></div>
        <div className="passage-repository-toolbar"><input aria-label="Search master passages" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, content or source ID…"/><select aria-label="Filter passages by language" value={repositoryLanguage} onChange={e=>setRepositoryLanguage(e.target.value as "all"|Lang)}><option value="all">All languages</option><option value="en">English</option><option value="hi">Hindi</option></select><select aria-label="Filter by simulator destination" value={repositoryDestination} onChange={e=>setRepositoryDestination(e.target.value)}><option value="all">All destinations</option>{templates.map(template=><option key={template.slug} value={template.slug}>{template.name}</option>)}</select></div>
        <div className="passage-repository-summary"><span><strong>{filtered.length}</strong> matching</span><span><strong>{repositoryStats.english}</strong> English</span><span><strong>{repositoryStats.hindi}</strong> Hindi</span><span><strong>{repositoryStats.unpublished}</strong> unpublished</span><span><strong>{repositoryStats.archived}</strong> archived</span></div>
        {loading?<p>Loading repository…</p>:<div className="tbl"><table><thead><tr><th>Passage ID</th><th>Passage</th><th>Language</th><th>Words</th><th>Version</th><th>Distribution</th><th>Actions</th></tr></thead><tbody>
          {filtered.map(source=><tr key={source.id}><td><code>{String(source.visible_number).padStart(2,"0")}</code></td><td><strong>{source.title}</strong><small>{source.source_type} · {new Date(source.created_at).toLocaleDateString()}</small></td><td>{source.language==="hi"?"Hindi":"English"}</td><td>{source.word_count}</td><td>v{source.version}</td><td><strong>{source.published_count}/{source.distribution_count} published</strong><small>{source.distributions.map(item=>item.name+" · "+item.status).join(" | ")||"No destinations"}</small></td><td><div className="admin-row-actions">{!source.archived_at&&<button type="button" onClick={()=>setEditing(source)}>Edit</button>}{!source.archived_at&&<button type="button" className="danger" onClick={()=>void archive(source)}>Archive</button>}{source.archived_at&&<span className="hint">Archived</span>}</div></td></tr>)}
          {!filtered.length&&<tr><td colSpan={7}>No master passages found.</td></tr>}
        </tbody></table></div>}
      </section>

      {editing&&<div className="admin-preview-overlay" role="dialog" aria-modal="true" aria-label="Edit master passage"><section className="admin-preview-dialog"><header><div><span>MASTER PASSAGE · NEW VERSION</span><h3>Edit source passage</h3><small>Version {editing.version} → {editing.version+1}</small></div><button type="button" onClick={()=>setEditing(null)}>Close ×</button></header><label>Title<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label><label>Language<select value={editing.language} onChange={e=>setEditing({...editing,language:e.target.value as Lang})}><option value="en">English</option><option value="hi">Hindi</option></select></label><label>Passage text<textarea rows={14} lang={editing.language} value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}/></label><p className="hint">{countWords(editing.body)} words · {editing.distribution_count} destinations</p>{editingValidation?.errors.map(error=><p className="err" key={error}>{error}</p>)}<footer><button type="button" onClick={()=>setEditing(null)}>Cancel</button><button type="button" className="go" disabled={busy||!editingValidation?.ok} onClick={()=>void saveEdit()}>{busy?"Publishing…":"Save and publish new version"}</button></footer></section></div>}
    </main>
  );
}
