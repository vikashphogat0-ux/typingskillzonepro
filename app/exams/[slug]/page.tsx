"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";

interface ExamData {
  slug: string;
  name: string;
  language: "en" | "hi";
  duration_sec: number;
  display_mode: string;
  backspace: string;
  scoring: any;
  description?: string;
  qualifying_wpm?: number;
  participants?: number;
}

function examIdentity(slug: string) {
  const value = slug.toLowerCase();
  if (value.includes("delhi-police") || value.includes("dp-hcm")) return { mark: "DP", short: "HCM", family: "Delhi Police", tone: "red" };
  if (value.includes("bsf")) return { mark: "BSF", short: "HCM", family: "Border Security Force", tone: "green" };
  if (value.includes("cisf")) return { mark: "CISF", short: "HCM", family: "Central Industrial Security Force", tone: "blue" };
  if (value.includes("crpf")) return { mark: "CRPF", short: "HCM", family: "Central Reserve Police Force", tone: "red" };
  if (value.includes("ssc")) return { mark: "SSC", short: value.includes("chsl") ? "CHSL" : value.includes("cgl") ? "CGL" : "SSC", family: "Staff Selection Commission", tone: "violet" };
  if (value.includes("rrb") || value.includes("railway")) return { mark: "RRB", short: "RRB", family: "Railway Recruitment Board", tone: "orange" };
  if (value.includes("court") || value.includes("jja") || value.includes("clerk")) return { mark: "HC", short: "COURT", family: "Court Recruitment", tone: "teal" };
  return { mark: "TSZ", short: "PRACTICE", family: "TypingSkillZone", tone: "blue" };
}

export default function ExamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    params.then(({ slug: routeSlug }) => {
      if (!active) return;
      setSlug(routeSlug);
      return api(`/api/templates/${encodeURIComponent(routeSlug)}`).then(result => {
        if (!active) return;
        if (result.ok && result.data) setExam(result.data);
        else setError(result.data?.error ?? "This examination could not be found.");
      });
    }).catch(() => {
      if (active) setError("Unable to connect to the examination catalogue. Please try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [params, retry]);

  if (loading) return <main className="page"><div className="exam-catalogue-state" role="status">Loading examination profile…</div></main>;
  if (error || !exam) return (
    <main className="page">
      <nav className="crumbs"><Link href="/">Home</Link> / <Link href="/exams">Exams</Link></nav>
      <section className="empty-state" role="alert">
        <h1>Examination unavailable</h1>
        <p>{error || "The requested examination profile is not available."}</p>
        <div className="cta-group">
          <button type="button" className="go" onClick={() => setRetry(value => value + 1)}>Try again</button>
          <Link className="go alt" href="/exams">Browse all examinations</Link>
        </div>
      </section>
    </main>
  );

  const identity = examIdentity(exam.slug);
  const modeLabel = exam.display_mode === "highlighted" ? "Live character feedback" : exam.display_mode === "unhighlighted" ? "Classic passage view" : "Paper-to-screen";
  const bsLabel = exam.backspace === "full" ? "Backspace allowed" : exam.backspace === "word" ? "Current word only" : "Backspace disabled";
  const scoringLabel = exam.scoring?.label ?? (exam.scoring?.unit === "keystrokes" ? "Key depressions" : "Configured WPM scoring");

  return (
    <main className="page exam-detail-page">
      <nav className="crumbs"><Link href="/">Home</Link> / <Link href="/exams">Exams</Link> / {exam.name}</nav>
      <section className="simulators-hero sim-v2-hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> DEDICATED EXAMINATION PROFILE</div>
        <div className="exam-detail-identity">
          <ExamEmblem slug={exam.slug} mark={identity.mark} short={identity.short} family={identity.family} tone={identity.tone} />
          <div>
            <p className="hint">{identity.family}</p>
            <h1>{exam.name}</h1>
            <p>{exam.description || "A dedicated typing practice environment with exam-specific timing, passage access, keyboard rules and performance tracking."}</p>
          </div>
        </div>
        <div className="sim-hero-stats">
          <span><strong>{Math.max(1, Math.round(exam.duration_sec / 60))} min</strong> configured duration</span>
          <span><strong>{exam.language === "hi" ? "हिन्दी" : "English"}</strong> practice language</span>
          <span><strong>{exam.participants ?? 0}</strong> participants</span>
        </div>
        <div className="cta-group">
          <Link className="go hero-primary" href={`/simulators/${encodeURIComponent(exam.slug)}`}>Open exam simulator <span>→</span></Link>
          <Link className="go hero-secondary" href="/exams">Explore other exams</Link>
        </div>
      </section>

      <section className="exam-pattern-card">
        <div><span className="exam-workspace-eyebrow">CURRENT PRACTICE CONFIGURATION</span><h2>Exam rules and simulator settings</h2></div>
        <div className="exam-rules-grid">
          <div><span>DURATION</span><strong>{Math.max(1, Math.round(exam.duration_sec / 60))} minutes</strong></div>
          <div><span>LANGUAGE</span><strong>{exam.language === "hi" ? "Hindi" : "English"}</strong></div>
          <div><span>DISPLAY MODE</span><strong>{modeLabel}</strong></div>
          <div><span>BACKSPACE</span><strong>{bsLabel}</strong></div>
          <div><span>SCORING</span><strong>{scoringLabel}</strong></div>
          {exam.qualifying_wpm ? <div><span>CONFIGURED QUALIFYING SPEED</span><strong>{exam.qualifying_wpm} WPM</strong></div> : null}
        </div>
        <p className="hint">These settings describe the current TypingSkillZone practice profile. Confirm the latest official recruitment notification before treating any duration, qualifying speed or scoring rule as an official requirement.</p>
        <div className="cta-group">
          <Link className="go" href={`/simulators/${encodeURIComponent(exam.slug)}`}>Continue to dedicated dashboard →</Link>
          <Link className="go alt" href="/exams">Back to exam directory</Link>
        </div>
      </section>
    </main>
  );
}
