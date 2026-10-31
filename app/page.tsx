"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";

type Exam = { slug: string; name: string; language: "en" | "hi"; duration_sec: number; description?: string };
type ExamGroup = { key: string; name: string; exams: Exam[]; mark: string; tone: string; family: string };

function identity(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes("delhi-police") || s.includes("dp-hcm")) return { mark: "DP", tone: "red", family: "Delhi Police" };
  if (s.includes("bsf")) return { mark: "BSF", tone: "green", family: "Border Security Force" };
  if (s.includes("cisf")) return { mark: "CISF", tone: "blue", family: "Central Industrial Security Force" };
  if (s.includes("crpf")) return { mark: "CRPF", tone: "red", family: "Central Reserve Police Force" };
  if (s.includes("ssc")) return { mark: "SSC", tone: "violet", family: "Staff Selection Commission" };
  if (s.includes("rrb") || s.includes("railway")) return { mark: "RRB", tone: "orange", family: "Railway Recruitment Board" };
  if (s.includes("dsssb")) return { mark: "DS", tone: "violet", family: "Delhi Subordinate Services Selection Board" };
  if (s.includes("court") || s.includes("jja") || s.includes("clerk")) return { mark: "HC", tone: "teal", family: "Court Recruitment" };
  return { mark: "TSZ", tone: "blue", family: "TypingSkillZone" };
}

function groupExams(exams: Exam[]): ExamGroup[] {
  const groups = new Map<string, ExamGroup>();
  for (const exam of exams) {
    const key = exam.slug.replace(/-(en|hi)$/, "");
    const info = identity(exam.slug);
    const existing = groups.get(key);
    if (existing) existing.exams.push(exam);
    else groups.set(key, { key, name: exam.name.replace(/\s*[—-]\s*(English|Hindi).*$/i, "").replace(/\s*\((English|Hindi).*$/i, ""), exams: [exam], ...info });
  }
  return [...groups.values()].slice(0, 9);
}

const features = [
  { number: "01", title: "Exam-specific simulators", text: "Each recruitment profile has its own dashboard, passage collection, keyboard policy and scoring configuration." },
  { number: "02", title: "Daily & monthly passages", text: "Open a daily passage or browse the archive by month. Search by passage title or unique ID." },
  { number: "03", title: "Verified result analysis", text: "Review gross speed, net speed, accuracy and error breakdown from your saved attempts." },
];

export default function Home() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/templates").then((r) => {
      if (!active) return;
      if (r.ok && Array.isArray(r.data)) setExams(r.data);
      else setError(r.data?.error ?? "The examination catalogue is temporarily unavailable.");
    }).catch(() => { if (active) setError("Unable to connect to the examination catalogue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const groups = useMemo(() => groupExams(exams), [exams]);

  return (
    <div className="tsz-home-v2">
      <section className="tsz-home-hero">
        <div className="tsz-home-hero-inner">
          <div className="tsz-home-copy">
            <div className="tsz-kicker"><i /> EXAM-READY TYPING PRACTICE</div>
            <h1>Prepare with purpose.<br /><span>Perform with precision.</span></h1>
            <p>One focused platform for competitive typing examinations. Choose your exam, practise in its actual pattern, and measure every improvement.</p>
            <div className="tsz-home-actions">
              <Link href="/exams" className="tsz-primary-button">Explore examinations <span>↗</span></Link>
              <Link href="/test" className="tsz-secondary-button">Start free practice</Link>
            </div>
            <div className="tsz-home-proof"><span><b>EN</b> English</span><i /><span><b>हि</b> Hindi</span><i /><span><b>CBT</b> Exam-style interface</span></div>
          </div>
          <div className="tsz-hero-visual">
            <div className="tsz-visual-glow" />
            <div className="tsz-preview-window">
              <div className="tsz-preview-top"><span><i /> LIVE SIMULATOR PREVIEW</span><b>10:00</b></div>
              <div className="tsz-preview-body">
                <div className="tsz-preview-label">PASSAGE PREVIEW <span>ENGLISH</span></div>
                <p>Regular practice develops accuracy, confidence and a steady typing rhythm. Candidates should focus on correct key placement and maintain consistent speed throughout the examination.</p>
                <div className="tsz-preview-caret">Regular practice develops accuracy, confidence and a steady typing rhythm<span /></div>
                <div className="tsz-preview-stats"><div><strong>42.8</strong><small>NET WPM</small></div><div><strong>97.4%</strong><small>ACCURACY</small></div><div><strong>08:32</strong><small>TIME LEFT</small></div></div>
                <div className="tsz-preview-progress"><i /></div>
              </div>
            </div>
            <div className="tsz-floating-note note-a">⌁ Exam-specific rules</div>
            <div className="tsz-floating-note note-b">↗ Progress you can measure</div>
          </div>
        </div>
      </section>

      <section className="tsz-home-feature-strip">
        <div><b>01</b><span><strong>Dedicated workspaces</strong><small>Separate dashboard for each exam</small></span></div>
        <div><b>02</b><span><strong>Daily & monthly library</strong><small>Passages organised by exam</small></span></div>
        <div><b>03</b><span><strong>Performance analytics</strong><small>Review every saved attempt</small></span></div>
      </section>

      <section className="tsz-home-exams" id="examinations">
        <div className="tsz-section-head"><div><span className="tsz-kicker">CHOOSE YOUR PATH</span><h2>Find your examination</h2><p>Open the dedicated simulator dashboard for your recruitment examination.</p></div><Link href="/exams">View all exams ↗</Link></div>
        {loading ? <div className="tsz-home-state">Loading active examinations…</div> : error ? <div className="tsz-home-state" role="alert">{error} <Link href="/exams">Open exam directory</Link></div> : groups.length ? (
          <div className="tsz-home-exam-grid">{groups.map((group) => {
            const preferred = group.exams.find((e) => e.language === "en") ?? group.exams[0];
            const languages = [...new Set(group.exams.map((e) => e.language))];
            return <article className="tsz-home-exam-card" key={group.key}>
              <div className="tsz-home-exam-card-top"><ExamEmblem slug={preferred.slug} mark={group.mark} short={group.family} family={group.family} tone={group.tone} /><span className="tsz-exam-code">{group.key.toUpperCase()}</span></div>
              <span className="tsz-exam-family">{group.family}</span><h3>{group.name}</h3>
              <p>{preferred.description || "Dedicated typing practice, exam-specific passages and performance tracking."}</p>
              <div className="tsz-home-exam-meta"><span>{languages.includes("en") ? "English" : ""}{languages.length > 1 ? " + " : ""}{languages.includes("hi") ? "Hindi" : ""}</span><span>{Math.round(preferred.duration_sec / 60)} min pattern</span></div>
              <div className="tsz-home-exam-link-list">{group.exams.map((exam) => <Link href={`/simulators/${exam.slug}`} key={exam.slug} className="tsz-home-exam-link">{exam.language === "hi" ? "Hindi workspace" : "English workspace"} <span>→</span></Link>)}</div>
            </article>;
          })}</div>
        ) : <div className="tsz-home-state">No active examination profiles are available yet. <Link href="/admin">Open admin</Link></div>}
      </section>

      <section className="tsz-home-features">
        <div className="tsz-section-head"><div><span className="tsz-kicker">THE PRACTICE SYSTEM</span><h2>Everything organised around your exam.</h2><p>Simple navigation, clear passage access and useful feedback.</p></div></div>
        <div className="tsz-home-feature-grid">{features.map((f) => <article key={f.number}><span>{f.number}</span><h3>{f.title}</h3><p>{f.text}</p></article>)}</div>
      </section>
      <section className="tsz-home-bottom-cta"><div><span className="tsz-kicker">YOUR NEXT SESSION STARTS HERE</span><h2>Make every practice session count.</h2><p>Choose your examination and continue from its own dashboard.</p></div><Link href="/exams" className="tsz-primary-button">Choose an exam <span>↗</span></Link></section>
    </div>
  );
}
