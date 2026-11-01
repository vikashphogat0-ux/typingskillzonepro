"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TypingSimulator, { type SimResult } from "@/components/TypingSimulator";
import Leaderboard from "@/components/Leaderboard";
import { api, fmtDate } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";
import { formatRkcPassage, getRkcPassageLayout } from "@/lib/rkc-passage-format";

interface SimInfo {
  slug: string; name: string; language: "en" | "hi"; duration_sec: number;
  display_mode: string; backspace: string; scoring: any; description?: string;
  passage_layout?: string; enter_key_policy?: "newline" | "blocked"; tab_key_policy?: "insert" | "blocked"; font_size_pt?: number; passage_font_family?: string; passage_alignment?: string; passage_line_spacing?: number; passage_paragraph_spacing?: number; print_page_size?: string;
  participants?: number; my_best?: string | null;
}
interface PassageItem { id: string; title: string; language?: string; word_count: number; preview?: string; date?: string; exam?: string; passage_number?: number; body?: string }
interface LibraryData {
  today?: string;
  daily?: Record<string, PassageItem | null>;
  dailyItems?: PassageItem[];
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
  const [passageOptions, setPassageOptions] = useState<{ id: string; title: string; word_count: number; passage_number?: number }[]>([]);
  const [passageOptionsLoading, setPassageOptionsLoading] = useState(false);
  const [passageOptionsError, setPassageOptionsError] = useState("");
  const [selectedPassageId, setSelectedPassageId] = useState("");
  const [practiceMode, setPracticeMode] = useState<"highlighted" | "unhighlighted" | "exam">("exam");
  const [passageSearch, setPassageSearch] = useState("");
  const [dailySearch, setDailySearch] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [passageSource, setPassageSource] = useState<"library" | "custom">("library");
  const [customPassage, setCustomPassage] = useState("");
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [month, setMonth] = useState("");
  const [selectedPreview, setSelectedPreview] = useState<PassageItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewRequestId = useRef(0);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    let active = true;
    if (!slug) return;
    setLoading(true); setError(""); setPassageOptions([]); setSelectedPassageId("");
    setPassageOptionsLoading(true); setPassageOptionsError("");
    api(`/api/simulators/${slug}`)
      .then(async r => {
        if (!active) return;
        if (!r.ok) { setError(r.data?.error ?? "Simulator not found."); setPassageOptionsLoading(false); return; }
        setSim(r.data);
        try {
          const passages = await api(`/api/library?lang=${r.data.language}&template=${encodeURIComponent(r.data.slug)}`);
          if (!active) return;
          if (passages.ok && Array.isArray(passages.data?.list)) setPassageOptions(passages.data.list);
          else setPassageOptionsError(passages.data?.error ?? "Exam passages could not be loaded.");
        } catch {
          if (active) setPassageOptionsError("Connection issue while loading exam passages.");
        } finally {
          if (active) setPassageOptionsLoading(false);
        }
      })
      .catch(() => { if (active) { setError("Network error. Please refresh."); setPassageOptionsLoading(false); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const retryPassageOptions = async () => {
    if (!sim) return;
    setPassageOptionsLoading(true);
    setPassageOptionsError("");
    try {
      const response = await api(`/api/library?lang=${sim.language}&template=${encodeURIComponent(sim.slug)}`);
      if (response.ok && Array.isArray(response.data?.list)) setPassageOptions(response.data.list);
      else setPassageOptionsError(response.data?.error ?? "Exam passages could not be loaded.");
    } catch {
      setPassageOptionsError("Connection issue while loading exam passages.");
    } finally {
      setPassageOptionsLoading(false);
    }
  };

  const loadLibrary = useCallback(async (selectedMonth?: string) => {
    if (!sim) return;
    setLibraryLoading(true); setLibraryError("");
    try {
      const params = new URLSearchParams({ lang: sim.language, template: sim.slug });
      if (selectedMonth) params.set("month", selectedMonth);
      let response = await api(`/api/library?${params.toString()}`);
      if (!response.ok) throw new Error(response.data?.error ?? "Passage library is unavailable.");
      // On the first monthly visit, load the newest month that actually contains passages,
      // rather than leaving the selector on an empty current month.
      const newestMonth = response.data?.months?.[0];
      if (!selectedMonth && tab === "monthly" && newestMonth) {
        const newestParams = new URLSearchParams({ lang: sim.language, month: newestMonth, template: sim.slug });
        response = await api(`/api/library?${newestParams.toString()}`);
        if (!response.ok) throw new Error(response.data?.error ?? "Monthly passage archive is unavailable.");
      }
      setLibrary(response.data);
      if (!selectedMonth && response.data?.months?.length) setMonth(response.data.months[0]);
      if (selectedMonth) setMonth(selectedMonth);
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : "Unable to load passages.");
    } finally { setLibraryLoading(false); }
  }, [sim, tab]);

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
    if (!sim || testState === "starting") return;
    setStartErr("");
    try {
      const customText = customPassage.trim();
      const requiredWords = customMinimumWords(slug);
      if (passageSource === "custom" && customText.split(/\s+/u).filter(Boolean).length < requiredWords) {
        setStartErr(`Paste at least ${requiredWords} words for this exam profile.`); setTestState("idle"); return;
      }
      const chosenPassage = passageId ?? selectedPassageId;
      if (passageSource === "library" && !passageId && chosenPassage && !passageOptions.some(item => item.id === chosenPassage)) {
        setStartErr("Your selected passage is no longer in this exam’s available list. Choose another passage or select random passage.");
        setTestState("idle");
        return;
      }
      setTestState("starting");
      const r = await api("/api/tests/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, practiceMode, ...(passageSource === "custom" ? { customPassage: customText } : chosenPassage ? { passageId: chosenPassage } : {}) }),
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
    const requestId = ++previewRequestId.current;
    setSelectedPreview(passage);
    setPreviewError("");
    if (passage.body) { setPreviewLoading(false); return; }
    setPreviewLoading(true);
    try {
      const response = await api(`/api/library?id=${encodeURIComponent(passage.id)}`);
      if (requestId !== previewRequestId.current) return;
      if (response.ok && response.data?.body) setSelectedPreview({ ...passage, ...response.data });
      else setPreviewError(response.data?.error ?? "The full passage text was not returned. Please try again.");
    } catch {
      if (requestId === previewRequestId.current) setPreviewError("Connection issue while opening this passage. Please try again.");
    } finally {
      if (requestId === previewRequestId.current) setPreviewLoading(false);
    }
  };

  const printMonthlyBundle = () => {
    if (!monthlyItems.length) return;
    const target = window.open("", "_blank");
    if (!target) { window.alert("Allow pop-ups to create the monthly PDF."); return; }
    const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const monthLabel = month ? new Date(month + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Monthly archive";
    const layout = sim?.passage_layout ?? getRkcPassageLayout(String(sim?.slug ?? ""));
    const paragraphSpacing = Math.max(0, Math.min(32, Number(sim?.passage_paragraph_spacing ?? 8)));
    const renderPassage = (value: string) => {
      const formatted = formatRkcPassage(value, layout);
      if (layout === "continuous") return `<p>${escapeHtml(formatted)}</p>`;
      return formatted.split(/\n{2,}/u).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("");
    };
    const sections = monthlyItems.map((item, index) => {
      return `<section class="passage"><h2>Passage ${String(index + 1).padStart(2, "0")} · ${escapeHtml(item.title)}</h2>${renderPassage(item.body ?? item.preview ?? "")}<small>${item.word_count} words · ${escapeHtml(item.date ?? "")}</small></section>`;
    }).join("");
    target.document.open();
    target.document.write(`<!doctype html><html lang="${sim?.language ?? "en"}"><head><meta charset="utf-8"><title>${escapeHtml(sim?.name ?? "TypingSkillZone")} · ${escapeHtml(monthLabel)}</title><style>body{font-family:${sim?.passage_font_family === "serif" ? "Georgia,serif" : sim?.passage_font_family === "mono" ? "monospace" : 'Arial,"Noto Sans Devanagari",sans-serif'};color:#172033;max-width:850px;margin:28px auto;padding:0 24px;line-height:${Math.max(1.1,Math.min(2.5,Number(sim?.passage_line_spacing ?? 1.5)))};text-align:${sim?.passage_alignment === "justify" ? "justify" : sim?.passage_alignment === "center" ? "center" : "left"}}h1{font-size:20pt;margin-bottom:4px}h2{font-size:13pt;margin:0 0 10px}.passage{margin:0 0 24px;page-break-inside:avoid}.passage p{font-size:${Math.max(8,Math.min(24,Number(sim?.font_size_pt ?? 12)))}pt;white-space:${layout === "continuous" ? "normal" : "pre-wrap"};margin:0 0 ${paragraphSpacing}pt}.passage small{color:#64748b}@page{size:${sim?.print_page_size === "Letter" ? "Letter" : sim?.print_page_size === "Legal" ? "Legal" : "A4"};margin:18mm}@media print{body{margin:0;max-width:none}}</style></head><body><h1>${escapeHtml(sim?.name ?? "TypingSkillZone")}</h1><p>${escapeHtml(monthLabel)} · ${monthlyItems.length} passages</p>${sections}<script>window.onload=()=>window.print()<\/script></body></html>`);
    target.document.close();
    target.focus();
  };

  const printPassage = async (passage: PassageItem) => {
    const target = window.open("", "_blank");
    if (!target) { window.alert("Allow pop-ups to print or save this passage as PDF."); return; }
    target.document.write("<!doctype html><title>Preparing passage…</title><p>Preparing print view…</p>");
    try {
      let full = passage;
      if (!full.body) {
        const response = await api(`/api/library?id=${encodeURIComponent(passage.id)}`);
        if (!response.ok) throw new Error(response.data?.error ?? "Unable to load passage.");
        full = { ...passage, ...response.data };
      }
      const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const title = escapeHtml(full.title || "Exam passage");
      const exam = escapeHtml(sim?.name || "TypingSkillZone");
      const rawBody = full.body ?? full.preview ?? "";
      // Use the simulator's saved presentation settings, matching its on-screen passage.
      const layout = sim?.passage_layout ?? getRkcPassageLayout(String(sim?.slug ?? ""));
      const formattedBody = formatRkcPassage(rawBody, layout);
      const paragraphSpacing = Math.max(0, Math.min(32, Number(sim?.passage_paragraph_spacing ?? 8)));
      const body = layout === "continuous"
        ? `<p>${escapeHtml(formattedBody)}</p>`
        : formattedBody.split(/\n{2,}/u).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("");
      const fontFamily = sim?.passage_font_family === "serif" ? "Georgia,serif" : sim?.passage_font_family === "mono" ? "monospace" : 'Arial,"Noto Sans Devanagari",sans-serif';
      const alignment = sim?.passage_alignment === "justify" ? "justify" : sim?.passage_alignment === "center" ? "center" : "left";
      const lineSpacing = Math.max(1.1, Math.min(2.5, Number(sim?.passage_line_spacing ?? 1.5)));
      target.document.open();
      target.document.write(`<!doctype html><html lang="${sim?.language ?? "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${exam} — ${title}</title><style>body{font-family:${fontFamily};max-width:850px;margin:32px auto;padding:0 24px;color:#172033;line-height:${lineSpacing};text-align:${alignment}}h1{font-size:18pt;margin:0 0 5px}h2{font-size:13pt;font-weight:500;margin:0 0 22px;color:#526176}.passage{font-size:${Math.max(8,Math.min(24,Number(sim?.font_size_pt ?? 12)))}pt;white-space:${layout === "continuous" ? "normal" : "pre-wrap"};overflow-wrap:anywhere}.passage p{margin:0 0 ${paragraphSpacing}pt}@page{size:${sim?.print_page_size === "Letter" ? "Letter" : sim?.print_page_size === "Legal" ? "Legal" : "A4"};margin:20mm}@media print{body{margin:0;max-width:none}}</style></head><body><h1>${exam}</h1><h2>${title} · Passage ID: ${String(full.passage_number ?? 1).padStart(2, "0")}</h2><div class="passage">${body}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
      target.document.close();
      target.focus();
    } catch (error) {
      target.document.body.textContent = error instanceof Error ? error.message : "Unable to prepare print view.";
    }
  };

  if (loading) return <div className="page"><p>Loading exam workspace…</p></div>;
  if (error || !sim) return <div className="page"><h1>Simulator not found</h1><p>{error}</p><a href="/simulators" className="go alt">Back to simulators</a></div>;

  if (testState === "running" && testData) return (
    <div className="page"><TypingSimulator key={testData.testId} passage={testData.reference} lang={testData.lang} durationSec={testData.durationSec} mode={testData.mode} practiceMode={testData.practiceMode} backspace={testData.backspace} profile={testData.profile} fontSizePt={testData.fontSizePt ?? 12} passageLayout={testData.passageLayout ?? "continuous"} passageFontFamily={testData.passageFontFamily ?? "system"} passageAlignment={testData.passageAlignment ?? "left"} passageLineSpacing={testData.passageLineSpacing ?? 1.5} passageParagraphSpacing={testData.passageParagraphSpacing ?? 8} printPageSize={testData.printPageSize ?? "A4"} examName={testData.name ?? sim.name} enterKeyPolicy={testData.enterKeyPolicy ?? "newline"} tabKeyPolicy={testData.tabKeyPolicy ?? "blocked"} onFinish={onFinish} /></div>
  );

  const identity = examIdentity(sim.slug);
  const scoring = sim.scoring ?? {};
  const visiblePassages = passageOptions.filter(p => !passageSearch.trim() || p.id.toLowerCase().includes(passageSearch.trim().toLowerCase()) || String(p.passage_number ?? "").padStart(2, "0").includes(passageSearch.trim().toLowerCase()) || p.title.toLowerCase().includes(passageSearch.trim().toLowerCase()));
  const monthlyItems = library?.monthly ?? [];
  const visibleMonthlyItems = monthlyItems.filter(item => {
    const query = monthlySearch.trim().toLowerCase();
    if (!query) return true;
    return item.id.toLowerCase().includes(query)
      || item.title.toLowerCase().includes(query)
      || String(item.passage_number ?? "").padStart(2, "0").includes(query)
      || (item.date ?? "").toLowerCase().includes(query);
  });
  const relevantResults = results.filter(r => !r.simulator || r.simulator.toLowerCase() === sim.name.toLowerCase());
  const bestNet = relevantResults.length ? Math.max(...relevantResults.map(r => Number(r.net_wpm) || 0)) : 0;
  const averageAccuracy = relevantResults.length ? relevantResults.reduce((sum, r) => sum + (Number(r.accuracy) || 0), 0) / relevantResults.length : 0;
  const customWordCount = customPassage.trim().split(/\\s+/u).filter(Boolean).length;
  const customWordsRequired = customMinimumWords(slug);
  const customPassageReady = passageSource !== "custom" || customWordCount >= customWordsRequired;
  const selectedLibraryPassage = passageOptions.find(item => item.id === selectedPassageId);
  const dailyItems = library?.dailyItems ?? [];
  const visibleDailyItems = dailyItems.filter(item => {
    const query = dailySearch.trim().toLowerCase();
    if (!query) return true;
    return item.id.toLowerCase().includes(query)
      || item.title.toLowerCase().includes(query)
      || String(item.passage_number ?? "").padStart(2, "0").includes(query)
      || (item.date ?? "").toLowerCase().includes(query);
  });

  return (
    <main className={`exam-workspace exam-workspace--${identity.tone}`} data-exam-tone={identity.tone} data-exam-slug={sim.slug}>
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
        {TABS.map(item => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => { setTab(item.id); setSelectedPreview(null); setPreviewError(""); previewRequestId.current += 1; setPreviewLoading(false); }}>{item.label}</button>)}
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
        <div className="exam-pattern-card"><div><span className="exam-workspace-eyebrow">EXAM PATTERN</span><h3>{sim.name} Test</h3></div><p>{sim.description || `${sim.name}: configured ${Math.round(sim.duration_sec / 60)}-minute typing test. Review the scoring, display and keyboard rules before starting.`}</p><div className="exam-pattern-tags"><span>{MODE_LABELS[sim.display_mode] ?? sim.display_mode}</span><span>{BS_LABELS[sim.backspace] ?? sim.backspace}</span><span>{scoring.unit === "keystrokes" ? "Key depressions" : "Words per minute"}</span><span>Paragraphs: {sim.passage_layout === "continuous" ? "Continuous" : "Preserve line breaks"}</span><span>Enter: {sim.enter_key_policy === "blocked" ? "Blocked" : "New paragraph"}</span><span>Tab: {sim.tab_key_policy === "insert" ? "Insert tab" : "Blocked"}</span><span>Font size: {sim.font_size_pt ?? 12} pt</span><span>Text alignment: {sim.passage_alignment ?? "left"}</span><span>Line spacing: {sim.passage_line_spacing ?? 1.5}</span><span>Paragraph spacing: {sim.passage_paragraph_spacing ?? 8} pt</span><span>Print page: {sim.print_page_size ?? "A4"}</span><span>Passage layout: {sim.passage_layout === "continuous" ? "Continuous text" : "Paragraph formatting"}</span></div><p className="hint">These are the simulator’s current practice settings. Confirm the latest official recruitment notification before treating them as an official exam specification.</p><button className="exam-text-link" onClick={() => setTab("practice")}>Review rules and start →</button></div>
        <div className="exam-dashboard-lower"><button onClick={() => setTab("leaderboard")}>View exam leaderboard ↗</button><a href="/exams">Explore other examinations ↗</a><a href="/library">Open full passage library ↗</a></div>
      </section>}

      {tab === "practice" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">EXAM MODE</span><h2>Practice this exam pattern</h2><p>Choose a passage and launch the timed simulator with this examination’s configured rules.</p></div></div>
        <div className="exam-pattern-summary"><strong>{sim.name}:</strong> {Math.round(sim.duration_sec / 60)}-minute test · {MODE_LABELS[sim.display_mode] ?? sim.display_mode} · {BS_LABELS[sim.backspace] ?? sim.backspace}. Always verify current official recruitment instructions.</div>
        {startErr && <p className="exam-workspace-error" role="alert">{startErr} {startErr.includes("Sign in") && <a href={`/login?next=/simulators/${slug}`}>Sign in</a>}{startErr.includes("Pro") && <a href="/pricing">Upgrade to Pro</a>}</p>}
        <div className="exam-passage-selector">
          <div className="exam-passage-selector-head"><h3>Exam passage collection</h3><a href="/library">Open full library ↗</a></div>
          <div className="exam-source-toggle"><button type="button" className={passageSource === "library" ? "selected" : ""} onClick={() => setPassageSource("library")}>Choose library passage</button><button type="button" className={passageSource === "custom" ? "selected" : ""} onClick={() => setPassageSource("custom")}>Use a custom passage</button></div>
          {passageSource === "custom" ? <><label className="exam-field">Paste your own passage (minimum {customWordsRequired} words)<textarea rows={7} maxLength={50000} value={customPassage} onChange={e => setCustomPassage(e.target.value)} placeholder="Paste your own passage here…" spellCheck={false}/></label><div className="exam-custom-passage-meter" aria-live="polite"><strong className={customPassageReady ? "is-ready" : ""}>{customWordCount} / {customWordsRequired} words</strong><span>{customPassageReady ? "Passage meets this exam’s minimum length." : `${customWordsRequired - customWordCount} more words required before starting.`}</span></div></> : <>
            <label className="exam-field">Find passage by title or unique ID<input value={passageSearch} onChange={e => setPassageSearch(e.target.value)} placeholder="Search by passage ID or title…"/></label>
            <label className="exam-field">Select passage<select value={selectedPassageId} onChange={e => setSelectedPassageId(e.target.value)} disabled={passageOptionsLoading || !!passageOptionsError || visiblePassages.length === 0}><option value="">Random passage for this exam language</option>{visiblePassages.map(p => <option key={p.id} value={p.id}>Passage ID: {String(p.passage_number ?? 1).padStart(2, "0")} · {p.title} · {p.word_count} words</option>)}</select></label>
            {passageOptionsLoading ? (
              <small role="status">Loading passages for {sim.name}…</small>
            ) : passageOptionsError ? (
              <p className="exam-workspace-error" role="alert">
                {passageOptionsError}{" "}
                <button type="button" onClick={() => void retryPassageOptions()}>Retry</button>
              </p>
            ) : (
              <small>
                {visiblePassages.length} matching passages available
                {passageSearch.trim() ? ` out of ${passageOptions.length}` : ""}.
                The selected simulator controls timing, scoring, layout and keyboard rules.
              </small>
            )}
            {selectedLibraryPassage && (
              <div className="exam-selected-passage" role="status"><span>SELECTED PASSAGE</span><strong>{selectedLibraryPassage.title}</strong><small>Passage ID: {String(selectedLibraryPassage.passage_number ?? 1).padStart(2, "0")} · {selectedLibraryPassage.word_count} words · {sim.language === "hi" ? "Hindi" : "English"}</small></div>
            )}
            {!selectedPassageId && (
              <small>Random selection: the server will choose an available passage for this exam language.</small>
            )}
            {!passageOptionsLoading && !passageOptionsError && passageSearch.trim() && visiblePassages.length === 0 && (
              <small>No passages match that search. Try a different ID or title.</small>
            )}
          </>}
        </div>
        <div className="exam-mode-picker">
          <div className="exam-mode-picker-heading"><h3>Choose typing practice mode</h3><p>Select how the passage should appear during typing. Exam-specific mode uses this simulator’s configured display and keyboard rules.</p></div>
          <div className="exam-mode-options">
            <button type="button" className={practiceMode === "highlighted" ? "selected" : ""} aria-pressed={practiceMode === "highlighted"} onClick={() => setPracticeMode("highlighted")}><span className="exam-mode-number">01</span><strong>Highlight mode</strong><small>Passage stays visible; typed characters highlight as you type.</small><em>Live character feedback</em></button>
            <button type="button" className={practiceMode === "unhighlighted" ? "selected" : ""} aria-pressed={practiceMode === "unhighlighted"} onClick={() => setPracticeMode("unhighlighted")}><span className="exam-mode-number">02</span><strong>Screen-to-screen mode</strong><small>Passage and typing area stay on screen without character highlighting.</small><em>Visible reference text</em></button>
            <button type="button" className={practiceMode === "exam" ? "selected" : ""} aria-pressed={practiceMode === "exam"} onClick={() => setPracticeMode("exam")}><span className="exam-mode-number">03</span><strong>Exam-specific mode</strong><small>Uses the display mode and typing rules configured for {sim.name}.</small><em>{MODE_LABELS[sim.display_mode] ?? sim.display_mode}</em></button>
          </div>
        </div>
        <div className="exam-rules-grid"><div><span>DURATION</span><strong>{Math.round(sim.duration_sec / 60)} minutes</strong></div><div><span>DISPLAY</span><strong>{sim.display_mode}</strong></div><div><span>BACKSPACE</span><strong>{sim.backspace}</strong></div><div><span>SCORING</span><strong>{scoring.unit === "keystrokes" ? "Key depressions" : scoring.netMethod ?? "Standard WPM"}</strong></div><div><span>PASSAGE FORMAT</span><strong>{sim.passage_layout === "continuous" ? "Continuous" : "Paragraphs"}</strong></div><div><span>ENTER KEY</span><strong>{sim.enter_key_policy === "blocked" ? "Blocked" : "New line"}</strong></div><div><span>TAB KEY</span><strong>{sim.tab_key_policy === "insert" ? "Insert tab" : "Blocked"}</strong></div></div>
        <div className="exam-practice-actions"><button className="exam-action-primary" disabled={testState === "starting" || !customPassageReady || (passageSource === "library" && (passageOptionsLoading || !!passageOptionsError || passageOptions.length === 0))} onClick={() => startTest()}>{testState === "starting" ? "Preparing test…" : !customPassageReady ? `Add ${customWordsRequired - customWordCount} more words` : "Start typing test →"}</button><button className="exam-action-secondary" onClick={() => { setTab("daily"); }}>Explore daily passages</button></div>
      </section>}

      {tab === "daily" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">DAILY PRACTICE · {sim.language === "hi" ? "HINDI" : "ENGLISH"}</span><h2>Today’s passages</h2><p>Passages uploaded during the current month remain here until month-end. After the month closes, the complete set moves into one combined monthly PDF.</p></div><button className="exam-small-refresh" onClick={() => void loadLibrary()}>Refresh passages ↻</button></div>
        <div className="exam-daily-toolbar">
          <label className="exam-field">Search this exam’s daily passages<input type="search" value={dailySearch} onChange={event => setDailySearch(event.target.value)} placeholder="Search by passage ID, title or date…" /></label>
          <span>{visibleDailyItems.length} of {dailyItems.length} passages</span>
          {dailySearch && <button type="button" className="exam-small-refresh" onClick={() => setDailySearch("")}>Clear search</button>}
        </div>
        {libraryLoading && <div className="exam-workspace-state">Loading today’s passages…</div>}
        {libraryError && <div className="exam-workspace-error">{libraryError}</div>}
        {!libraryLoading && !libraryError && <div className="exam-passage-list">{visibleDailyItems.map(item => <article className="exam-passage-row" key={item.id}><div className="exam-passage-row-main"><span className="exam-passage-row-exam">{sim.name}</span><strong>{item.title}</strong><small>{item.date ?? "This month"} · {item.word_count} words · Passage ID: {String(item.passage_number ?? 1).padStart(2, "0")}</small></div><div className="exam-passage-row-actions"><button onClick={() => void fetchPreview(item)}>View</button><button onClick={() => void printPassage(item)}>Print</button><button className="exam-row-practice" onClick={() => { setPassageSource("library"); setSelectedPassageId(item.id); setTab("practice"); }}>Practise</button></div></article>)}{!dailyItems.length && <div className="exam-workspace-state">No passages have been uploaded for this exam during the current month.</div>}{dailyItems.length > 0 && !visibleDailyItems.length && <div className="exam-workspace-state">No daily passages match “{dailySearch}”. Try a passage ID, title or date.</div>}</div>}
        {selectedPreview && <div className="exam-passage-preview"><div><h3>{selectedPreview.title} · Passage ID: {String(selectedPreview.passage_number ?? 1).padStart(2, "0")}</h3><div className="exam-passage-row-actions"><button onClick={() => void printPassage(selectedPreview)}>Print</button><button onClick={() => { previewRequestId.current += 1; setSelectedPreview(null); setPreviewError(""); setPreviewLoading(false); }}>Close ×</button></div></div>{previewLoading ? <p role="status">Loading full passage…</p> : previewError ? <p className="exam-workspace-error" role="alert">{previewError} <button type="button" onClick={() => void fetchPreview(selectedPreview)}>Retry</button></p> : <p>{selectedPreview.body ?? selectedPreview.preview}</p>}<button className="exam-action-primary" onClick={() => { setSelectedPassageId(selectedPreview.id); setPassageSource("library"); setTab("practice"); }}>Practise this passage →</button></div>}
      </section>}

      {tab === "monthly" && <section className="exam-workspace-panel">
        <div className="exam-workspace-section-heading"><div><span className="exam-workspace-eyebrow">COMPLETED MONTH ARCHIVE · {sim.language === "hi" ? "HINDI" : "ENGLISH"}</span><h2>Monthly passage PDFs</h2><p>Each completed month is presented as one combined PDF containing all passages uploaded to this exam’s daily library during that month.</p></div></div>
        <div className="exam-month-toolbar"><label>Select completed month<select value={month} onChange={e => { setMonth(e.target.value); setMonthlySearch(""); setSelectedPreview(null); void loadLibrary(e.target.value); }}><option value="">Choose month</option>{(library?.months ?? []).map(m => <option key={m} value={m}>{new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}</select></label><span>{monthlyItems.length} passages · {monthlyItems.reduce((sum, item) => sum + Number(item.word_count || 0), 0)} total words</span></div>
        {libraryLoading && <div className="exam-workspace-state">Preparing monthly collection…</div>}
        {libraryError && <div className="exam-workspace-error">{libraryError}</div>}
        {!libraryLoading && !libraryError && monthlyItems.length > 0 && <>
          <article className="exam-passage-row exam-passage-row-feature"><div className="exam-passage-row-main"><span className="exam-passage-row-exam">{sim.name} · MONTHLY COLLECTION</span><strong>{month ? new Date(month + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Completed month"}</strong><small>{monthlyItems.length} passages · Numbered from 01 in upload order</small></div><div className="exam-passage-row-actions"><button className="exam-row-practice" onClick={printMonthlyBundle}>Print / Save monthly PDF</button></div></article>
          <div className="exam-daily-toolbar exam-monthly-search"><label className="exam-field">Find a passage in this month<input type="search" value={monthlySearch} onChange={event => setMonthlySearch(event.target.value)} placeholder="Search by passage ID, title or date…" /></label><span>{visibleMonthlyItems.length} of {monthlyItems.length} passages</span>{monthlySearch && <button type="button" className="exam-small-refresh" onClick={() => setMonthlySearch("")}>Clear search</button>}</div>
          <div className="exam-passage-list">{visibleMonthlyItems.map(item => <article className="exam-passage-row" key={item.id}><div className="exam-passage-row-main"><span className="exam-passage-row-exam">{sim.name} · MONTHLY ARCHIVE</span><strong>{item.title}</strong><small>{item.date ?? "Archived passage"} · {item.word_count} words · Passage ID: {String(item.passage_number ?? 1).padStart(2, "0")}</small></div><div className="exam-passage-row-actions"><button onClick={() => void fetchPreview(item)}>View</button><button onClick={() => void printPassage(item)}>Print</button><button className="exam-row-practice" onClick={() => { setPassageSource("library"); setSelectedPassageId(item.id); setTab("practice"); }}>Practise</button></div></article>)}{!visibleMonthlyItems.length && <div className="exam-workspace-state">No archived passages match “{monthlySearch}”. Try another ID, title or date.</div>}</div>
        </>}
        {!libraryLoading && !libraryError && !monthlyItems.length && <div className="exam-workspace-state">No completed monthly PDF is available yet. This month’s passages remain in Daily passages until the month closes.</div>}
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
