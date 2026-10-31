"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import TypingSimulator, { type SimResult } from "@/components/TypingSimulator";
import Leaderboard from "@/components/Leaderboard";
import { api, fmtDate } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";

interface SimInfo {
  slug: string; name: string; language: "en" | "hi"; duration_sec: number;
  display_mode: string; backspace: string; scoring: any; description?: string;
  participants?: number; my_best?: string | null;
}
interface PassageItem { id: string; title: string; language?: string; word_count: number; preview?: string; date?: string; exam?: string; passage_number?: number; body?: string }
interface LibraryData {
  today?: string;
  daily?: Record<string, PassageItem>;
  archive?: Record<string, PassageItem[]>;
  monthly?: PassageItem[];
  months?: string[];
}
interface ResultItem { id: string; created_at: string; net_wpm: number | string; gross_wpm: number | string; accuracy: number | string; simulator?: string }

type WorkspaceTab = "dashboard" | "practice" | "daily" | "monthly" | "performance" | "leaderboard";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "dashboard", label: "Exam dashboard" },
  { id: "practice", label: "Practice test" },
  { id: "daily", label: "Daily passages" },
  { id: "monthly", label: "Monthly library" },
  { id: "performance", label: "My performance" },
  { id: "leaderboard", label: "Leaderboard" },
];

const MODE_LABELS: Record<string, string> = {
  highlighted: "Highlighted — passage on screen, characters colour as you type",
  unhighlighted: "Unhighlighted — passage on screen, no colour feedback",
  offscreen: "Paper to screen — read the printed passage, type from memory",
};
const BS_LABELS: Record<string, string> = {
  full: "Full backspace — delete anywhere in your typed text",
  word: "Current word only — backspace cannot cross a space",
  disabled: "Disabled — no corrections allowed",
};
const examIdentity = (slug: string) => {
  const s = slug.toLowerCase();
  if (s.includes("delhi-police") || s.includes("dp-hcm")) return { mark: "DP", short: "DELHI POLICE", tone: "red", family: "Delhi Police · Head Constable Ministerial" };
  if (s.includes("bsf")) return { mark: "BSF", short: "BSF HCM", tone: "green", family: "Border Security Force · Head Constable Ministerial" };
  if (s.includes("cisf")) return { mark: "CISF", short: "CISF HCM", tone: "blue", family: "Central Industrial Security Force" };
  if (s.includes("crpf")) return { mark: "CRPF", short: "CRPF HCM", tone: "red", family: "Central Reserve Police Force" };
  if (s.includes("ssc")) return { mark: "SSC", short: s.includes("chsl") ? "CHSL" : s.includes("cgl") ? "CGL" : "SSC", tone: "violet", family: "Staff Selection Commission" };
  if (s.includes("rrb") || s.includes("railway")) return { mark: "RRB", short: "RRB", tone: "orange", family: "Railway Recruitment Board" };
  if (s.includes("dsssb")) return { mark: "DSSSB", short: "DSSSB", tone: "violet", family: "Delhi Subordinate Services Selection Board" };
  if (s.includes("court") || s.includes("jja") || s.includes("clerk")) return { mark: "HC", short: "COURT", tone: "teal", family: "Court Recruitment" };
  return { mark: "TSZ", short: "EXAM PREP", tone: "blue", family: "TypingSkillZone exam practice" };
};
const customMinimumWords = (slug: string) => slug === "dp-hcm-en" ? 400 : slug === "dp-hcm-hi" ? 350 : slug === "rrb-ntpc-en" ? 300 : slug === "rrb-ntpc-hi" ? 250 : 10;

export default function SimulatorPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [sim, setSim] = useState<SimInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WorkspaceTab>("dashboard");
  const [testState, setTestState] = useState<"idle" | "starting" | "running" | "done">("idle");
  const [testData, setTestData] = useState<any>(null);
  const [startErr, setStartErr] = useState("");
  const [passageOptions, setPassageOptions] = useState<{ id: string; title: string; word_count: number }[]>([]);
  const [selectedPassageId, setSelectedPassageId] = useState("");
  const [passageSearch, setPassageSearch] = useState("");
  const [passageSource, setPassageSource] = useState<"library" | "custom">("library");
  const [customPassage, setCustomPassage] = useState("");
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [month, setMonth] = useState("");
  const [selectedPreview, setSelectedPreview] = useState<PassageItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    let active = true;
    if (!slug) return;
    setLoading(true); setError("");
    api(`/api/simulators/${slug}`)
      .then(async r => {
        if (!active) return;
        if (!r.ok) { setError(r.data?.error ?? "Simulator not found."); return; }
        setSim(r.data);
        const passages = await api(`/api/library?lang=${r.data.language}`);
        if (!active) return;
        if (passages.ok && Array.isArray(passages.data?.list)) setPassageOptions(passages.data.list);
      })
      .catch(() => { if (active) setError("Network error. Please refresh."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const loadLibrary = useCallback(async (selectedMonth?: string) => {
    if (!sim) return;
    setLibraryLoading(true); setLibraryError("");
    try {
      const params = new URLSearchParams({ lang: sim.language });
      if (selectedMonth) params.set("month", selectedMonth);
      let response = await api(`/api/library?${params.toString()}`);
      if (!response.ok) throw new Error(response.data?.error ?? "Passage library is unavailable.");
      // On the first monthly visit, load the newest month that actually contains passages,
      // rather than leaving the selector on an empty current month.
      const newestMonth = response.data?.months?.[0];
      if (!selectedMonth && tab === "monthly" && newestMonth) {
        const newestParams = new URLSearchParams({ lang: sim.language, month: newestMonth });
        response = await api(`/api/library?${newestParams.toString()}`);
        if (!response.ok) throw new Error(response.data?.error ?? "Monthly passage archive is unavailable.");
      }
      setLibrary(response.data);
      if (!selectedMonth && response.data?.months?.length) setMonth(response.data.months[0]);
      if (selectedMonth) setMonth(selectedMonth);
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : "Unable to load passages.");
    } finally { setLibraryLoading(false); }
  }, [sim]);

  useEffect(() => {
    if ((tab === "daily" || tab === "monthly") && sim) void loadLibrary(tab === "monthly" ? month || undefined : undefined);
  }, [tab, sim, loadLibrary]); // month changes are handled by the selector callback below

  useEffect(() => {
    if (tab !== "performance" || !sim) return;
    let active = true;
    setResultsLoading(true); setResultsError("");
    api("/api/results").then(r => {
      if (!active) return;
      if (r.ok && Array.isArray(r.data)) setResults(r.data);
      else setResultsError(r.status === 401 ? "Sign in to view your saved performance." : r.data?.error ?? "Unable to load performance.");
    }).catch(() => { if (active) setResultsError("Unable to load your performance history."); })
      .finally(() => { if (active) setResultsLoading(false); });
    return () => { active = false; };
  }, [tab, sim]);

  const startTest = async (passageId?: string) => {
    if (!sim) return;
    setStartErr(""); setTestState("starting");
    try {
      const customText = customPassage.trim();
      const requiredWords = customMinimumWords(slug);
      if (passageSource === "custom" && customText.split(/\s+/u).filter(Boolean).length < requiredWords) {
        setStartErr(`Paste at least ${requiredWords} words for this exam profile.`); setTestState("idle"); return;
      }
      const chosenPassage = passageId ?? selectedPassageId;
      const r = await api("/api/tests/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...(passageSource === "custom" ? { customPassage: customText } : chosenPassage ? { passageId: chosenPassage } : {}) }),
      });
      if (!r.ok) {
        setTestState("idle");
        if (r.status === 401) setStartErr("Sign in to use exam simulators.");
        else if (r.status === 402) setStartErr(r.data?.error ?? "Daily limit reached. Upgrade to Pro for unlimited tests.");
        else setStartErr(r.data?.error ?? `Could not start the test (HTTP ${r.status}).`);
        return;
      }
      setTestData(r.data); setTestState("running");
    } catch (e) {
      setTestState("idle");
      setStartErr(e instanceof Error ? `Could not start the test: ${e.message}` : "Network error while starting the test. Check your connection and try again.");
    }
  };

  const onFinish = useCallback(async (result: SimResult) => {
    setTestState("done");
    try { sessionStorage.setItem("tsz:last", JSON.stringify(result)); } catch {}
    const res = await api("/api/results", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result, testId: testData?.testId }),
    }).then(r => r.data).catch(() => null);
    router.push(res?.id ? `/results/${res.id}` : "/dashboard");
  }, [router, testData]);

  const fetchPreview = async (passage: PassageItem) => {
    setSelectedPreview(passage);
    if (passage.body) return;
    setPreviewLoading(true);
    try {
      const response = await api(`/api/library?id=${encodeURIComponent(passage.id)}`);
      if (response.ok) setSelectedPreview({ ...passage, ...response.data });
      else setLibraryError(response.data?.error ?? "Unable to open this passage.");
    } catch { setLibraryError("Unable to open this passage."); }
    finally { setPreviewLoading(false); }
  };

  if (loading) return <div className="page"><p>Loading exam workspace…</p></div>;
  if (error || !sim) return <div className="page"><h1>Simulator not found</h1><p>{error}</p><a href="/simulators" className="go alt">Back to simulators</a></div>;

  if (testState === "running" && testData) return (
    <div className="page"><TypingSimulator key={testData.testId} passage={testData.reference} lang={testData.lang} durationSec={testData.durationSec} mode={testData.mode} backspace={testData.backspace} profile={testData.profile} fontSizePt={testData.fontSizePt ?? 12} passageLayout={testData.passageLayout ?? "continuous"} examName={testData.name ?? sim.name} enterKeyPolicy={testData.enterKeyPolicy ?? "newline"} tabKeyPolicy={testData.tabKeyPolicy ?? "blocked"} onFinish={onFinish} /></div>
  );

  const identity = examIdentity(sim.slug);
  const scoring = sim.scoring ?? {};
  const visiblePassages = passageOptions.filter(p => !passageSearch.trim() || p.id.toLowerCase().includes(passageSearch.trim().toLowerCase()) || p.title.toLowerCase().includes(passageSearch.trim().toLowerCase()));
  const todayPassage = library?.daily?.[sim.language];
  const monthlyItems = library?.monthly ?? [];
  const relevantResults = results.filter(r => !r.simulator || r.simulator.toLowerCase() === sim.name.toLowerCase());
  const bestNet = relevantResults.length ? Math.max(...relevantResults.map(r => Number(r.net_wpm) || 0)) : 0;
  const averageAccuracy = relevantResults.length ? relevantResults.reduce((sum, r) => sum + (Number(r.accuracy) || 0), 0) / relevantResults.length : 0;
  const archiveItems = library?.archive?.[sim.language] ?? [];

  return (
    <main className="exam-workspace">
      <section className="exam-workspace-hero">
        <div className="exam-workspace-identity">
          <ExamEmblem slug={sim.slug} mark={identity.mark} short={identity.short} family={identity.family} tone={identity.tone} />
          <div className="exam-workspace-title">
            <span className="exam-workspace-eyebrow">{identity.family}</span>
            <h1>{sim.name}</h1>
            <p>{sim.language === "hi" ? "हिंदी" : "English"} · {Math.max(1, Math.round(sim.duration_sec / 60))} minutes · {sim.participants ?? 0} ranked participants{sim.my_best ? ` · Your best ${sim.my_best} net WPM` : ""}</p>
            {sim.description && <small>{sim.description}</small>}
          </div>
        </div>
        <div className="exam-workspace-hero-badges"><span>{sim.language === "hi" ? "HINDI" : "ENGLISH"}</span><span>{Math.round(sim.duration_sec / 60)} MIN TEST</span><span>EXAM-SPECIFIC RULES</span></div>
      </section>

      <nav className="exam-workspace-tabs" aria-label="Exam workspace navigation">
        {TABS.map(item => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => { setTab(item.id); setSelectedPreview(null); }}>{item.label}</button>)}
      </nav>

      {tab === "dashboard" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">YOUR EXAM WORKSPACE</span><h2>Student dashboard</h2><p>Use this exam space for its pattern, passage set, timed practice, saved scores and ranking.</p></div><span className="exam-workspace-status">READY TO PRACTISE</span></div>
        <div className="exam-dashboard-actions">
          <button className="exam-action-primary" onClick={() => setTab("practice")}>Start a practice test <span>→</span></button>
          <button className="exam-action-secondary" onClick={() => setTab("daily")}>Daily passages</button>
          <button className="exam-action-secondary" onClick={() => setTab("monthly")}>Browse this exam’s passages ({passageOptions.length})</button>
          <button className="exam-action-secondary" onClick={() => setTab("performance")}>View my performance</button>
        </div>
        <div className="exam-dashboard-metrics">
          <div><span>TEST DURATION</span><strong>{Math.round(sim.duration_sec / 60)} min</strong><small>Configured for this exam</small></div>
          <div><span>PASSAGE COLLECTION</span><strong>{passageOptions.length}</strong><small>Available in {sim.language === "hi" ? "Hindi" : "English"}</small></div>
          <div><span>YOUR BEST NET WPM</span><strong>{sim.my_best ?? "—"}</strong><small>Personal best on record</small></div>
          <div><span>RANKED PARTICIPANTS</span><strong>{sim.participants ?? 0}</strong><small>On this simulator</small></div>
        </div>
        <div className="exam-pattern-card"><div><span className="exam-workspace-eyebrow">EXAM PATTERN</span><h3>{sim.name} Test</h3></div><p>{sim.description || `${sim.name}: configured ${Math.round(sim.duration_sec / 60)}-minute typing test. Review the scoring, display and keyboard rules before starting.`}</p><div className="exam-pattern-tags"><span>{MODE_LABELS[sim.display_mode] ?? sim.display_mode}</span><span>{BS_LABELS[sim.backspace] ?? sim.backspace}</span><span>{scoring.unit === "keystrokes" ? "Key depressions" : "Words per minute"}</span></div><button className="exam-text-link" onClick={() => setTab("practice")}>Review rules and start →</button></div>
        <div className="exam-dashboard-lower"><button onClick={() => setTab("leaderboard")}>View exam leaderboard ↗</button><a href="/exams">Explore other examinations ↗</a><a href="/library">Open full passage library ↗</a></div>
      </section>}

      {tab === "practice" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">EXAM MODE</span><h2>Practice this exam pattern</h2><p>Choose a passage and launch the timed simulator with this examination’s configured rules.</p></div></div>
        <div className="exam-pattern-summary"><strong>{sim.name}:</strong> {Math.round(sim.duration_sec / 60)}-minute test · {MODE_LABELS[sim.display_mode] ?? sim.display_mode} · {BS_LABELS[sim.backspace] ?? sim.backspace}. Always verify current official recruitment instructions.</div>
        {startErr && <p className="exam-workspace-error" role="alert">{startErr} {startErr.includes("Sign in") && <a href={`/login?next=/simulators/${slug}`}>Sign in</a>}{startErr.includes("Pro") && <a href="/pricing">Upgrade to Pro</a>}</p>}
        <div className="exam-passage-selector">
          <div className="exam-passage-selector-head"><h3>Exam passage collection</h3><a href="/library">Open full library ↗</a></div>
          <div className="exam-source-toggle"><button type="button" className={passageSource === "library" ? "selected" : ""} onClick={() => setPassageSource("library")}>Choose library passage</button><button type="button" className={passageSource === "custom" ? "selected" : ""} onClick={() => setPassageSource("custom")}>Use a custom passage</button></div>
          {passageSource === "custom" ? <label className="exam-field">Paste your own passage (minimum {customMinimumWords(slug)} words)<textarea rows={7} maxLength={50000} value={customPassage} onChange={e => setCustomPassage(e.target.value)} placeholder="Paste your own passage here…" spellCheck={false}/></label> : <>
            <label className="exam-field">Find passage by title or unique ID<input value={passageSearch} onChange={e => setPassageSearch(e.target.value)} placeholder="Search by passage ID or title…"/></label>
            <label className="exam-field">Select passage<select value={selectedPassageId} onChange={e => setSelectedPassageId(e.target.value)}><option value="">Random passage for this exam language</option>{visiblePassages.map(p => <option key={p.id} value={p.id}>{p.title} · {p.word_count} words · ID {p.id}</option>)}</select></label>
            <small>{visiblePassages.length} matching passages available. The selected simulator controls timing, scoring, layout and keyboard rules.</small>
          </>}
        </div>
        <div className="exam-rules-grid"><div><span>DURATION</span><strong>{Math.round(sim.duration_sec / 60)} minutes</strong></div><div><span>DISPLAY</span><strong>{sim.display_mode}</strong></div><div><span>BACKSPACE</span><strong>{sim.backspace}</strong></div><div><span>SCORING</span><strong>{scoring.unit === "keystrokes" ? "Key depressions" : scoring.netMethod ?? "Standard WPM"}</strong></div></div>
        <div className="exam-practice-actions"><button className="exam-action-primary" disabled={testState === "starting"} onClick={() => startTest()}>{testState === "starting" ? "Preparing test…" : "Start typing test →"}</button><button className="exam-action-secondary" onClick={() => { setTab("daily"); }}>Explore daily passages</button></div>
      </section>}

      {tab === "daily" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">DAILY PRACTICE · {sim.language === "hi" ? "HINDI" : "ENGLISH"}</span><h2>Daily passages</h2><p>Open today’s selected passage or revisit recent daily practice passages for this language.</p></div><button className="exam-small-refresh" onClick={() => void loadLibrary()}>Refresh passages ↻</button></div>
        {libraryLoading && <div className="exam-workspace-state">Loading daily passages…</div>}
        {libraryError && <div className="exam-workspace-error">{libraryError}</div>}
        {!libraryLoading && todayPassage && <article className="exam-daily-feature"><div className="exam-passage-card-top"><span className="exam-workspace-eyebrow">TODAY’S PASSAGE</span><span>{library?.today ?? todayPassage.date}</span></div><h3>{todayPassage.title}</h3><p>{todayPassage.body ?? todayPassage.preview}</p><div className="exam-passage-card-footer"><span>{todayPassage.word_count} words · {sim.language === "hi" ? "Hindi" : "English"} · ID {todayPassage.id}</span><div><a href={`/api/library/download?id=${encodeURIComponent(todayPassage.id)}`}>Download TXT ↓</a><button onClick={() => { setPassageSource("library"); setSelectedPassageId(todayPassage.id); setTab("practice"); }}>Practise this passage →</button></div></div></article>}
        {!libraryLoading && !todayPassage && !libraryError && <div className="exam-workspace-state">No daily passage is available for this language today.</div>}
        <div className="exam-workspace-subheading"><h3>Recent daily passages</h3><span>Last 14 days</span></div>
        <div className="exam-daily-list">{archiveItems.map(item => <article key={item.date + item.id}><div><strong>{item.title}</strong><small>{item.date} · {item.word_count} words</small></div><button onClick={() => void fetchPreview(item)}>Preview</button><button onClick={() => { setSelectedPassageId(item.id); setPassageSource("library"); setTab("practice"); }}>Practise →</button></article>)}</div>
        {selectedPreview && <div className="exam-passage-preview"><div><h3>{selectedPreview.title}</h3><button onClick={() => setSelectedPreview(null)}>Close ×</button></div>{previewLoading ? <p>Loading passage…</p> : <p>{selectedPreview.body ?? selectedPreview.preview}</p>}<button className="exam-action-primary" onClick={() => { setSelectedPassageId(selectedPreview.id); setPassageSource("library"); setTab("practice"); }}>Practise this passage →</button></div>}
      </section>}

      {tab === "monthly" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">PASSAGE ARCHIVE · {sim.language === "hi" ? "HINDI" : "ENGLISH"}</span><h2>Monthly passage library</h2><p>Select a month to browse the full passage archive available for this exam’s language.</p></div></div>
        <div className="exam-month-toolbar"><label>Select month<select value={month} onChange={e => { setMonth(e.target.value); setSelectedPreview(null); void loadLibrary(e.target.value); }}><option value="">Choose month</option>{(library?.months ?? []).map(m => <option key={m} value={m}>{new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}</select></label><span>{monthlyItems.length} passages in selected month</span></div>
        {libraryLoading && <div className="exam-workspace-state">Loading monthly archive…</div>}
        {libraryError && <div className="exam-workspace-error">{libraryError}</div>}
        {!libraryLoading && !libraryError && <div className="exam-monthly-list">{monthlyItems.map(item => <article key={item.id}><div className="exam-month-number">{item.passage_number ?? "—"}</div><div className="exam-month-copy"><strong>{item.title}</strong><small>{item.date ?? "Archive"} · {item.word_count} words · ID {item.id}</small><p>{item.preview}</p></div><div className="exam-month-actions"><button onClick={() => void fetchPreview(item)}>Preview</button><a href={`/api/library/download?id=${encodeURIComponent(item.id)}`}>Download</a><button onClick={() => { setSelectedPassageId(item.id); setPassageSource("library"); setTab("practice"); }}>Practise</button></div></article>)}{!monthlyItems.length && <div className="exam-workspace-state">No passages found for this month and language.</div>}</div>}
        {selectedPreview && <div className="exam-passage-preview"><div><h3>{selectedPreview.title}</h3><button onClick={() => setSelectedPreview(null)}>Close ×</button></div>{previewLoading ? <p>Loading passage…</p> : <p>{selectedPreview.body ?? selectedPreview.preview}</p>}<button className="exam-action-primary" onClick={() => { setSelectedPassageId(selectedPreview.id); setPassageSource("library"); setTab("practice"); }}>Practise this passage →</button></div>}
      </section>}

      {tab === "performance" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">PERSONAL ANALYTICS</span><h2>My performance</h2><p>Your saved results for {sim.name}. Complete a simulator test to add a verified attempt.</p></div><button className="exam-small-refresh" onClick={async () => { setResultsLoading(true); setResultsError(""); try { const response = await api("/api/results"); if (response.ok && Array.isArray(response.data)) setResults(response.data); else setResultsError(response.status === 401 ? "Sign in to view your saved performance." : response.data?.error ?? "Unable to load performance."); } catch { setResultsError("Unable to load your performance history."); } finally { setResultsLoading(false); } }}>Refresh ↻</button></div>
        {resultsLoading && <div className="exam-workspace-state">Loading your saved results…</div>}
        {resultsError && <div className="exam-workspace-error">{resultsError} {resultsError.includes("Sign in") && <a href={`/login?next=/simulators/${slug}`}>Sign in</a>}</div>}
        {!resultsLoading && !resultsError && <><div className="exam-dashboard-metrics"><div><span>YOUR ATTEMPTS</span><strong>{relevantResults.length}</strong><small>Saved results for this exam</small></div><div><span>BEST NET WPM</span><strong>{bestNet.toFixed(2)}</strong><small>Personal best</small></div><div><span>AVERAGE ACCURACY</span><strong>{averageAccuracy.toFixed(1)}%</strong><small>Across saved attempts</small></div></div><div className="exam-performance-table"><table><thead><tr><th>Date</th><th>Gross WPM</th><th>Net WPM</th><th>Accuracy</th><th>Result</th></tr></thead><tbody>{relevantResults.map(result => <tr key={result.id}><td>{fmtDate(result.created_at)}</td><td>{Number(result.gross_wpm).toFixed(2)}</td><td>{Number(result.net_wpm).toFixed(2)}</td><td>{Number(result.accuracy).toFixed(1)}%</td><td><a href={`/results/${result.id}`}>View result ↗</a></td></tr>)}{!relevantResults.length && <tr><td colSpan={5}>No saved attempts for this exam yet. Start a practice test to see your performance here.</td></tr>}</tbody></table></div><button className="exam-action-primary" onClick={() => setTab("practice")}>Start a new test →</button></>}
      </section>}

      {tab === "leaderboard" && <section className="exam-workspace-panel"><div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">COMPETITIVE RANKING</span><h2>Exam leaderboard</h2><p>Compare your best valid attempt with other students using this same simulator’s rules.</p></div></div><Leaderboard slug={slug} /></section>}
      <p className="exam-workspace-disclaimer">TypingSkillZone is an independent exam-preparation platform. Simulator settings are practice configurations; always confirm the latest duration, qualifying criteria, keyboard rules and scoring from the official recruitment notification.</p>
    </main>
  );
}
