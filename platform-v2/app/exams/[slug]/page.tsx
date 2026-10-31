import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EXAMS, getExam } from "@/lib/exams";

export function generateStaticParams() { return EXAMS.map((exam) => ({ slug: exam.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const exam = getExam(slug);
  return { title: exam ? `${exam.name} Simulator` : "Examination" };
}

export default async function ExamWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const exam = getExam(slug); if (!exam) notFound();
  return <main className="workspace-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">T</span><span>TypingSkill<span className="brand-accent">Zone</span><small>EXAM WORKSPACE</small></span></Link><Link className="back-link" href="/">← All examinations</Link></header><section className="workspace-hero"><div className="eyebrow">DEDICATED EXAMINATION WORKSPACE · {exam.code}</div><h1>{exam.name}</h1><p>{exam.description}</p><div className="workspace-tags">{exam.languages.map((language)=><span key={language}>{language}</span>)}<span>{exam.passagePresentation} presentation</span></div></section><section className="workspace-grid"><article className="workspace-panel primary-panel"><div className="panel-kicker">PRACTICE</div><h2>Build your typing consistency.</h2><p>Choose a published passage to begin a timed or untimed practice session. Passage access will be connected to the new publication service in the next implementation phase.</p><div className="empty-state"><span>⌁</span><strong>No passages connected yet</strong><small>This new workspace is intentionally isolated from legacy data until the new data model is ready.</small></div></article><div className="workspace-side"><article className="workspace-panel"><div className="panel-kicker">DAILY PASSAGES</div><h3>Today’s practice</h3><p>Newly published passages for this examination.</p><span className="coming-label">PASSAGE SERVICE · PHASE 2</span></article><article className="workspace-panel"><div className="panel-kicker">MONTHLY ARCHIVE</div><h3>Practice by month</h3><p>Browse historical passages by month, language and ID.</p><span className="coming-label">PASSAGE SERVICE · PHASE 2</span></article><article className="workspace-panel"><div className="panel-kicker">EXAM POLICY</div><h3>Rules verification required</h3><p>Official timing, penalties and keyboard restrictions must be verified before qualification scoring is enabled.</p><span className="coming-label">VERIFICATION GATE ACTIVE</span></article></div></section><footer className="footer"><Link href="/">TypingSkillZone</Link><span>New platform foundation · No legacy data connected</span></footer></main>;
}
