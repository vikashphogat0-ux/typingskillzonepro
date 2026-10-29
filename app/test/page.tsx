"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TypingSimulator, { type SimResult } from "@/components/TypingSimulator";
import { PRESETS, SAMPLE_PASSAGES, type DisplayMode, type ExamPreset } from "@/lib/presets";
import { PROFILES } from "@/lib/wpmCalculator";
import type { BackspaceMode } from "@/lib/backspacePolicy";

const modeOptions: { value: DisplayMode; title: string; description: string }[] = [
  { value: "highlighted", title: "Live feedback", description: "Correct and incorrect characters are highlighted as you type." },
  { value: "unhighlighted", title: "Classic view", description: "Type against a plain passage without live colour feedback." },
  { value: "offscreen", title: "Paper-to-screen", description: "Practise copying from a passage before it moves out of view." },
];

export default function TestPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<ExamPreset[]>(PRESETS);
  const [slug, setSlug] = useState(PRESETS[0].slug);
  const preset = useMemo(() => presets.find((p) => p.slug === slug) ?? presets[0], [presets, slug]);
  const [mode, setMode] = useState<DisplayMode>(preset.mode);
  const [bs, setBs] = useState<BackspaceMode>(preset.backspace);
  const [passage, setPassage] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [loading, setLoading] = useState(false);
  const [limitMsg, setLimitMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [localResult, setLocalResult] = useState<SimResult | null>(null);
  const [passageOptions, setPassageOptions] = useState<{ id: string; title: string; word_count: number }[]>([]);
  const [selectedPassageId, setSelectedPassageId] = useState("");
  const [passageSource, setPassageSource] = useState<"library" | "custom">("library");
  const [customPassage, setCustomPassage] = useState("");
  const [customPassageError, setCustomPassageError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/templates")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error ?? "Exam presets could not be loaded.");
        return data;
      })
      .then((rows) => {
        if (!active || !Array.isArray(rows) || !rows.length) return;
        const db: ExamPreset[] = rows.map((t: any) => ({
          slug: t.slug, name: t.name, lang: t.language, durationSec: t.duration_sec,
          profileId: t.scoring?.id ?? "practice", mode: t.display_mode, backspace: t.backspace, profile: t.scoring,
        }));
        const slugs = new Set(db.map((d) => d.slug));
        const merged = [...db, ...PRESETS.filter((p) => !slugs.has(p.slug))];
        setPresets(merged);
        setSlug((current) => merged.some((p) => p.slug === current) ? current : merged[0].slug);
        setNotice("");
      })
      .catch((e) => { if (active) setNotice(e instanceof Error ? e.message : "Using built-in practice presets while the exam catalogue is unavailable."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setSelectedPassageId("");
    fetch(`/api/library?lang=${preset.lang}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => { if (active && ok && Array.isArray(data?.list)) setPassageOptions(data.list); })
      .catch(() => { if (active) setPassageOptions([]); });
    return () => { active = false; };
  }, [preset.lang]);

  useEffect(() => {
    const p = presets.find((x) => x.slug === slug) ?? presets[0];
    if (p) { setMode(p.mode); setBs(p.backspace); }
  }, [slug, presets]);

  const choose = (s: string) => {
    const p = presets.find((x) => x.slug === s);
    if (!p) return;
    setSlug(s); setMode(p.mode); setBs(p.backspace); setLimitMsg("");
  };

  const start = async () => {
    setLoading(true); setLimitMsg(""); setLocalResult(null); setCustomPassageError("");
    const pastedText = customPassage.trim();
    if (passageSource === "custom") {
      const wordCount = pastedText ? pastedText.split(/\s+/u).filter(Boolean).length : 0;
      if (wordCount < 10) { setCustomPassageError("Paste at least 10 words to start practice."); setLoading(false); return; }
      if (Array.from(pastedText).length > 50000) { setCustomPassageError("Keep your passage under 50,000 characters."); setLoading(false); return; }
    }
    let text: string | null = null;
    try {
      // Keep the existing server-side test-access/usage gate for custom and library passages.
      const url = "/api/passages?lang=" + preset.lang + "&template=" + encodeURIComponent(preset.slug) +
        (passageSource === "library" && selectedPassageId ? "&id=" + encodeURIComponent(selectedPassageId) : "");
      const r = await fetch(url);
      const data = await r.json().catch(() => ({}));
      if (r.status === 402) { setLimitMsg(data.error ?? "Your daily free-test limit has been reached."); setLoading(false); return; }
      if (passageSource === "custom") text = pastedText;
      else if (selectedPassageId && (!r.ok || typeof data.body !== "string" || !data.body.trim())) {
        setNotice(data.error ?? "The selected passage could not be loaded. Choose it again or select a different passage.");
        setLoading(false);
        return;
      } else if (r.ok && typeof data.body === "string" && data.body.trim()) text = data.body;
      else if (r.status === 503) setNotice(data.error ?? "Passage service is temporarily unavailable; using a built-in practice passage.");
    } catch {
      if (passageSource === "custom") text = pastedText;
      else if (selectedPassageId) {
        setNotice("Could not load the selected passage because the passage service is unreachable. Check your connection and try again.");
        setLoading(false);
        return;
      } else setNotice("Could not reach the passage service; using a built-in practice passage.");
    }
    if (!text) {
      const samples = SAMPLE_PASSAGES[preset.lang];
      text = samples[Math.floor(Math.random() * samples.length)];
    }
    setPassage(text); setRun(Date.now()); setLoading(false);
  };

  const profile = preset.profile ?? PROFILES[preset.profileId] ?? PROFILES.practice;
  const isPracticePreset = profile.id === "practice";
  const onFinish = useCallback(async (r: SimResult) => {
    try { sessionStorage.setItem("tsz:last", JSON.stringify(r)); } catch {}
    const res = await fetch("/api/results", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, presetSlug: slug, mode, backspace: bs }),
    }).then((x) => x.json()).catch(() => null);
    if (res?.id) router.push(`/results/${res.id}`);
    else { setLocalResult(r); setPassage(null); }
  }, [router, slug, mode, bs, selectedPassageId]);

  if (localResult) return (
    <div className="page practice-page">
      <section className="practice-result">
        <div className="eyebrow"><span className="eyebrow-dot" /> PRACTICE COMPLETE</div>
        <h1>Your typing result</h1>
        <p>{preset.name} · {Math.round(localResult.elapsedSec)} seconds practiced</p>
        <div className="practice-result-grid">
          <div><span>Gross speed</span><strong>{localResult.score.grossWpm} WPM</strong></div>
          <div><span>Net speed</span><strong>{localResult.score.netWpm} WPM</strong></div>
          <div><span>Accuracy</span><strong>{localResult.score.accuracy}%</strong></div>
          <div><span>Errors</span><strong>{localResult.score.fullErrors + localResult.score.halfErrors}</strong></div>
        </div>
        <p className="practice-notice">This result is shown locally because the database or sign-in service is unavailable. It has not been saved to your account history.</p>
        <div className="cta-group"><button className="practice-start" onClick={() => { setLocalResult(null); setPassage(null); setNotice(""); }}>Practise again →</button><a className="go hero-secondary" href="/library">Choose another passage</a></div>
      </section>
    </div>
  );

  if (passage) return <div className="page"><TypingSimulator key={run} passage={passage} lang={preset.lang} durationSec={preset.durationSec} mode={mode} backspace={bs} profile={profile} onFinish={onFinish} /></div>;

  return (
    <div className="page practice-page">
      <section className="practice-hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR DAILY PRACTICE</div>
        <h1>Make every keystroke count.</h1>
        <p>Choose your exam pattern, set your typing environment, and focus on building consistent speed with accuracy.</p>
        <div className="practice-hero-pills"><span>English & Hindi</span><span>1–15 minute presets</span><span>Instant typing feedback</span></div>
      </section>

      <div className="practice-layout">
        <section className="practice-config">
          <div className="practice-section-heading"><div><span className="practice-step">01</span><div><h2>Choose your test</h2><p>Select the exam or warm-up that matches your goal.</p></div></div></div>
          <label className="practice-field">Exam or practice preset
            <select value={slug} onChange={(e) => choose(e.target.value)}>
              {presets.map((p) => <option key={p.slug} value={p.slug}>{p.name} · {Math.max(1, Math.round(p.durationSec / 60))} min</option>)}
            </select>
          </label>
          <div className="practice-field">
            <span className="practice-field-label">Passage source</span>
            <div className="practice-mode-grid custom-passage-source" role="group" aria-label="Choose passage source">
              <button type="button" className={passageSource === "library" ? "practice-mode-card selected" : "practice-mode-card"} aria-pressed={passageSource === "library"} onClick={() => { setPassageSource("library"); setCustomPassageError(""); }}>
                <strong>Library passage</strong><span>Choose a saved passage or get a random one.</span>
              </button>
              <button type="button" className={passageSource === "custom" ? "practice-mode-card selected" : "practice-mode-card"} aria-pressed={passageSource === "custom"} onClick={() => { setPassageSource("custom"); setCustomPassageError(""); }}>
                <strong>✎ My custom passage</strong><span>Paste your own text and practise with this exam's rules.</span>
              </button>
            </div>
          </div>
          {passageSource === "library" ? (
            <label className="practice-field">Select library passage
              <select value={selectedPassageId} onChange={(e) => setSelectedPassageId(e.target.value)}>
                <option value="">Random passage for this language</option>
                {passageOptions.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.word_count} words</option>)}
              </select>
              <small>Exam duration, scoring profile, display pattern and backspace policy remain applied.</small>
            </label>
          ) : (
            <label className="practice-field">Paste your own {preset.lang === "hi" ? "Hindi" : "English"} passage
              <textarea className="custom-passage-input" value={customPassage} onChange={(e) => { setCustomPassage(e.target.value); setCustomPassageError(""); }} placeholder={preset.lang === "hi" ? "यहाँ अपना हिंदी अनुच्छेद पेस्ट करें…" : "Paste or type your own passage here…"} rows={8} maxLength={50000} spellCheck={false} />
              <small>{customPassage.trim() ? customPassage.trim().split(/\s+/u).filter(Boolean).length : 0} words · Maximum 50,000 characters. Your passage is not published to the library.</small>
              {customPassageError && <span className="err" role="alert">{customPassageError}</span>}
            </label>
          )}
          <div className="practice-summary">
            <div className="practice-summary-mark">{preset.lang === "hi" ? "हि" : "EN"}</div>
            <div className="practice-summary-copy"><strong>{preset.name}</strong><span>{preset.lang === "hi" ? "Hindi · Devanagari typing" : "English typing"} · {Math.max(1, Math.round(preset.durationSec / 60))} minute{preset.durationSec >= 120 ? "s" : ""}</span></div>
            <span className="practice-summary-status"><i /> Ready</span>
          </div>

          <div className="practice-section-heading"><div><span className="practice-step">02</span><div><h2>Set your environment</h2><p>Use the same visual and correction rules you want to practise.</p></div></div></div>
          <div className="practice-mode-grid">
            {modeOptions.map((option) => <button type="button" key={option.value} className={`practice-mode-card ${mode === option.value ? "selected" : ""}`} aria-pressed={mode === option.value} disabled={!isPracticePreset} onClick={() => setMode(option.value)}>
              <span className="practice-mode-check">{mode === option.value ? "✓" : "○"}</span><strong>{option.title}</strong><span>{option.description}</span>
            </button>)}
          </div>
          <label className="practice-field">Backspace policy
            <select value={bs} disabled={!isPracticePreset} onChange={(e) => setBs(e.target.value as BackspaceMode)}>
              <option value="full">Full correction — delete anywhere</option>
              <option value="word">Current word only — exam-style restriction</option>
              <option value="disabled">Disabled — no corrections</option>
            </select>
          </label>
          <p className="practice-disclaimer">{isPracticePreset ? "Practice mode: you can change display and correction settings freely." : "Exam preset selected: display mode and backspace policy are fixed by this template so your practice does not silently diverge from its configured rules. Choose Free Practice to customize them."} Confirm the current recruitment notification before relying on qualifying rules.</p>
          {notice && <p className="practice-notice" role="status">{notice}</p>}
          {limitMsg && <p className="err" role="alert">{limitMsg} <a href="/pricing">View Pro plans</a></p>}
          <button className="practice-start" onClick={start} disabled={loading}>{loading ? <><span className="practice-spinner" /> Preparing your passage…</> : <>Start typing test <span>→</span></>}</button>
        </section>

        <aside className="practice-side">
          <div className="practice-side-card practice-side-dark"><span className="practice-side-icon">⌨</span><span className="eyebrow">YOUR FOCUS</span><h2>Accuracy first.<br/>Speed follows.</h2><p>Steady rhythm and clean keystrokes build better results than rushing.</p><div className="practice-mini-keys"><span>A</span><span>S</span><span>D</span><span>F</span><span className="practice-key-active">J</span><span>K</span><span>L</span></div></div>
          <div className="practice-side-card"><span className="practice-side-number">03</span><h3>Before you begin</h3><ul><li>Settle your fingers on the home row.</li><li>Keep your eyes on the passage.</li><li>Prioritise accuracy, then build speed.</li></ul></div>
          <a className="practice-library-link" href="/library"><span>▤</span><div><strong>Need more passages?</strong><small>Explore the English and Hindi library</small></div><b>↗</b></a>
        </aside>
      </div>
    </div>
  );
}
