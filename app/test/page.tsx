"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TypingSimulator, { type SimResult } from "@/components/TypingSimulator";
import { PRESETS, SAMPLE_PASSAGES, type DisplayMode, type ExamPreset } from "@/lib/presets";
import { PROFILES } from "@/lib/wpmCalculator";
import type { BackspaceMode } from "@/lib/backspacePolicy";

export default function TestPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<ExamPreset[]>(PRESETS);
  const [slug, setSlug] = useState(PRESETS[0].slug);
  const preset = presets.find((p) => p.slug === slug) ?? presets[0];
  const [mode, setMode] = useState<DisplayMode>(preset.mode);
  const [bs, setBs] = useState<BackspaceMode>(preset.backspace);
  const [passage, setPassage] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [loading, setLoading] = useState(false);
  const [limitMsg, setLimitMsg] = useState("");

  // admin-created templates replace built-in presets that share a slug and add new ones
  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((rows) => {
      if (!Array.isArray(rows) || !rows.length) return;
      const db: ExamPreset[] = rows.map((t: any) => ({ slug: t.slug, name: t.name, lang: t.language, durationSec: t.duration_sec, profileId: t.scoring?.id ?? "practice", mode: t.display_mode, backspace: t.backspace, profile: t.scoring }));
      const slugs = new Set(db.map((d) => d.slug));
      setPresets([...db, ...PRESETS.filter((p) => !slugs.has(p.slug))]);
    }).catch(() => {});
  }, []);

  const choose = (s: string) => {
    const p = presets.find((x) => x.slug === s)!;
    setSlug(s); setMode(p.mode); setBs(p.backspace);
  };

  const start = async () => {
    setLoading(true);
    let text: string | null = null;
    try {
      const r = await fetch(`/api/passages?lang=${preset.lang}&template=${encodeURIComponent(preset.slug)}`);
      if (r.status === 402) { setLimitMsg((await r.json()).error); setLoading(false); return; }
      if (r.ok) text = (await r.json()).body;
    } catch {}
    if (!text) { const list = SAMPLE_PASSAGES[preset.lang]; text = list[Math.floor(Math.random() * list.length)]; }
    setPassage(text); setRun(Date.now()); setLoading(false);
  };

  const profile = preset.profile ?? PROFILES[preset.profileId] ?? PROFILES.practice;
  const onFinish = useCallback(async (r: SimResult) => {
    try { sessionStorage.setItem("tsz:last", JSON.stringify(r)); } catch {}
    const res = await fetch("/api/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...r, presetSlug: slug, mode, backspace: bs }) }).then((x) => x.json()).catch(() => null);
    router.push(res?.id ? `/results/${res.id}` : "/dashboard");
  }, [router, slug, mode, bs]);

  if (passage)
    return <div className="page"><TypingSimulator key={run} passage={passage} lang={preset.lang} durationSec={preset.durationSec} mode={mode} backspace={bs} profile={profile} onFinish={onFinish} /></div>;

  return (
    <div className="page setup">
      <h1>Set up your test</h1>
      <label>Exam<select value={slug} onChange={(e) => choose(e.target.value)}>{presets.map((p) => <option key={p.slug} value={p.slug}>{p.name}, {Math.round(p.durationSec / 60)} min</option>)}</select></label>
      <label>Passage display<select value={mode} onChange={(e) => setMode(e.target.value as DisplayMode)}>
        <option value="highlighted">Highlighted: shows right and wrong letters as you type</option>
        <option value="unhighlighted">Unhighlighted: plain passage, no feedback</option>
        <option value="offscreen">Paper to screen: passage on top, empty box below</option></select></label>
      <label>Backspace<select value={bs} onChange={(e) => setBs(e.target.value as BackspaceMode)}>
        <option value="full">Full: delete anything</option>
        <option value="word">Current word only</option>
        <option value="disabled">Disabled</option></select></label>
      <p className="hint">Presets are practice defaults. Check your exam’s official notification for the exact rules.</p>
      {limitMsg && <p className="err" role="alert">{limitMsg} <a href="/pricing">See Pro plans</a></p>}
      <button className="go" onClick={start} disabled={loading}>{loading ? "Loading passage…" : "Start test"}</button>
    </div>
  );
}
