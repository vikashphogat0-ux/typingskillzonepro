"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanBody, countWords, defaultScoring, parseBulk, validatePassage } from "@/lib/adminValidation";
import { PROFILES, type Lang } from "@/lib/wpmCalculator";

type Tpl = { slug: string; name: string; language: Lang; duration_sec: number; display_mode: string; backspace: string; scoring: any; is_active: boolean };
type Row = { id: string; title: string; language: Lang; word_count: number; preview: string; template: string | null };

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
const post = (url: string, body: unknown) => api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const emptyTpl = { slug: "", name: "", language: "en" as Lang, minutes: 10, displayMode: "highlighted", backspace: "full", base: "practice", unit: "words", netMethod: "penalty", qualifying: "", maxErr: "", caseOnly: true, punctOnly: true };

export default function Admin() {
  const [tab, setTab] = useState<"passages" | "templates">("passages");
  const [denied, setDenied] = useState(false);
  const [msg, setMsg] = useState("");
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [generationBusy, setGenerationBusy] = useState("");
  const [generationMsg, setGenerationMsg] = useState("");

  const runGeneration = async (slot: "morning" | "afternoon" | "live") => {
    const label = slot === "morning" ? "7 AM batch (5 passages)" : slot === "afternoon" ? "1 PM batch (5 passages)" : "7 PM live batch (2 passages)";
    if (!confirm(`Generate ${label}? This uses the configured AI provider and saves new passages to the shared library.`)) return;
    setGenerationBusy(slot); setGenerationMsg("");
    try {
      const r = await post("/api/admin/passages/generate", { slot });
      if (!r.ok) setGenerationMsg(r.data.error ?? "Generation failed. Check provider configuration and database migration.");
      else { setGenerationMsg(`Generated ${r.data.generated} passage(s) for ${r.data.date} (${slot}). Word counts: ${(r.data.wordCounts ?? []).join(", ") || "already completed"}.`); await load(); }
    } catch { setGenerationMsg("Network error while generating passages."); }
    finally { setGenerationBusy(""); }
  };

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api("/api/admin/templates"), api("/api/admin/passages")]);
    if (a.status === 403 || b.status === 403 || a.status === 500) { setDenied(true); return; }
    setTpls(a.data); setRows(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ---------- passages ---------- */
  const [title, setTitle] = useState(""); const [lang, setLang] = useState<Lang>("en"); const [body, setBody] = useState(""); const [tplSlug, setTplSlug] = useState("");
  const check = useMemo(() => validatePassage({ title, language: lang, body }), [title, lang, body]);
  const [bulk, setBulk] = useState<{ title: string; body: string }[]>([]);
  const bulkChecks = useMemo(() => bulk.map((b) => validatePassage({ ...b, language: lang })), [bulk, lang]);

  const savePassages = async (items: { title: string; language: Lang; body: string }[]) => {
    const r = await post("/api/admin/passages", { items, templateSlug: tplSlug || undefined });
    if (r.ok) { setMsg(`Saved ${r.data.saved} passage${r.data.saved === 1 ? "" : "s"}.`); setTitle(""); setBody(""); setBulk([]); load(); }
    else setMsg(r.data.problems ? r.data.problems.map((p: any) => `#${p.index + 1}: ${p.errors.join(" ")}`).join("  ") : r.data.error ?? "Could not save.");
  };
  const onFile = async (f?: File) => { if (f) setBulk(parseBulk(await f.text())); };
  const delPassage = async (id: string) => { if (confirm("Delete this passage?")) { await api(`/api/admin/passages?id=${id}`, { method: "DELETE" }); load(); } };

  /* ---------- templates ---------- */
  const [t, setT] = useState(emptyTpl);
  const upd = (k: keyof typeof emptyTpl, v: any) => setT((x) => ({ ...x, [k]: v }));
  const selectedProfile = PROFILES[t.base] ?? PROFILES.practice;
  const saveTpl = async () => {
    const scoring = { ...defaultScoring(t.base), id: t.slug, label: t.name, unit: t.unit, netMethod: t.netMethod, halfRules: { caseOnly: t.caseOnly, punctuationOnly: t.punctOnly }, qualifyingWpm: t.qualifying === "" ? undefined : Number(t.qualifying), maxErrorPercent: t.maxErr === "" ? undefined : Number(t.maxErr) };
    const r = await post("/api/admin/templates", { slug: t.slug.trim(), name: t.name, language: t.language, durationSec: Math.round(t.minutes * 60), displayMode: t.displayMode, backspace: t.backspace, scoring });
    setMsg(r.ok ? "Template saved." : r.data.error ?? "Could not save."); if (r.ok) { setT(emptyTpl); load(); }
  };
  const editTpl = (x: Tpl) => setT({ slug: x.slug, name: x.name, language: x.language, minutes: x.duration_sec / 60, displayMode: x.display_mode, backspace: x.backspace, base: (PROFILES[x.scoring.id] ? x.scoring.id : "practice"), unit: x.scoring.unit, netMethod: x.scoring.netMethod, qualifying: x.scoring.qualifyingWpm?.toString() ?? "", maxErr: x.scoring.maxErrorPercent?.toString() ?? "", caseOnly: !!x.scoring.halfRules?.caseOnly, punctOnly: !!x.scoring.halfRules?.punctuationOnly });
  const delTpl = async (slug: string) => { if (confirm(`Delete template ${slug}? Passages stay but lose the link.`)) { await api(`/api/admin/templates?slug=${slug}`, { method: "DELETE" }); load(); } };

  if (denied) return <div className="page"><h1>Admin</h1><p>Admin access is required. Sign in with an admin account (users.role = &apos;admin&apos;).</p></div>;

  return (
    <div className="page admin">
      <h1>Admin</h1>
      <p><a href="/admin/subscribers">Manage subscribers</a> · <a href="/admin/institutions">Manage institutes</a></p>
      <section className="admin-generation-panel">
        <h2>Daily Passage Automation</h2>
        <p className="hint">Each batch generates original passages of at least 500 words and stores them as shared library content. Simulator templates control only presentation and exam rules.</p>
        <div className="cta-group">
          <button className="go" disabled={!!generationBusy} onClick={() => runGeneration("morning")}>{generationBusy === "morning" ? "Generating…" : "Generate 7 AM · 5 passages"}</button>
          <button className="go" disabled={!!generationBusy} onClick={() => runGeneration("afternoon")}>{generationBusy === "afternoon" ? "Generating…" : "Generate 1 PM · 5 passages"}</button>
          <button className="go" disabled={!!generationBusy} onClick={() => runGeneration("live")}>{generationBusy === "live" ? "Generating…" : "Generate 7 PM · 2 live sets"}</button>
        </div>
        {generationMsg && <p className="flash-msg" role="status">{generationMsg}</p>}
        <p className="hint">Automatic schedule requires the additive SQL migrations plus the same strong PASSAGE_CRON_SECRET configured in both GitHub Actions secrets and Cloudflare Worker secrets.</p>
      </section>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "passages"} onClick={() => setTab("passages")}>Passages</button>
        <button role="tab" aria-selected={tab === "templates"} onClick={() => setTab("templates")}>Exam templates</button>
      </div>
      {msg && <p className="flash-msg" role="status">{msg}</p>}

      {tab === "passages" ? (
        <>
          <h2>Add a passage</h2>
          <div className="form">
            <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
            <label>Language<select value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="en">English</option><option value="hi">Hindi</option></select></label>
            <label>Attach to exam template (optional)<select value={tplSlug} onChange={(e) => setTplSlug(e.target.value)}><option value="">Any exam</option>{tpls.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></label>
            <label>Passage text<textarea rows={8} lang={lang} value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => setBody(cleanBody(body))} /></label>
            <p className="hint">{countWords(body)} words</p>
            {check.errors.map((e) => <p key={e} className="err">{e}</p>)}
            {check.warnings.map((e) => <p key={e} className="warn">{e}</p>)}
            <button className="go" disabled={!check.ok} onClick={() => savePassages([check.clean])}>Save passage</button>
          </div>

          <h2>Upload many at once</h2>
          <p className="hint">Use a .txt file in UTF-8. Separate passages with a line containing only ---. Start a passage with a line like “# Title” to name it. Language and template above apply to all.</p>
          <input type="file" accept=".txt,text/plain" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload passages file" />
          {bulk.length > 0 && (<>
            <p>{bulk.length} passages found, {bulkChecks.filter((c) => c.ok).length} valid.</p>
            <ul>{bulkChecks.map((c, i) => <li key={i}>{c.clean.title}: {c.ok ? "ready" : <span className="err">{c.errors.join(" ")}</span>}</li>)}</ul>
            <button className="go" disabled={bulkChecks.some((c) => !c.ok)} onClick={() => savePassages(bulkChecks.map((c) => c.clean))}>Save all</button>
          </>)}

          <h2>Saved passages ({rows.length})</h2>
          <div className="tbl"><table><thead><tr><th>Title</th><th>Language</th><th>Words</th><th>Exam</th><th></th></tr></thead><tbody>
            {rows.map((r) => <tr key={r.id}><td title={r.preview}>{r.title}</td><td>{r.language === "hi" ? "Hindi" : "English"}</td><td>{r.word_count}</td><td>{r.template ?? "Any"}</td><td><button className="link" onClick={() => delPassage(r.id)}>Delete</button></td></tr>)}
            {!rows.length && <tr><td colSpan={5}>No passages yet. Add one above. Until then students get the built-in samples.</td></tr>}
          </tbody></table></div>
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
            {tpls.map((x) => <tr key={x.slug}><td>{x.name}</td><td>{x.language === "hi" ? "Hindi" : "English"}</td><td>{x.duration_sec / 60} min</td><td>{x.display_mode}</td><td>{x.backspace}</td><td><button className="link" onClick={() => editTpl(x)}>Edit</button> <button className="link" onClick={() => delTpl(x.slug)}>Delete</button></td></tr>)}
            {!tpls.length && <tr><td colSpan={6}>No templates yet. Students see the built-in presets.</td></tr>}
          </tbody></table></div>
        </>
      )}
    </div>
  );
}
