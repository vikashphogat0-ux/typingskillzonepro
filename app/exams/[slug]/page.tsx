"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/clientApi";
import { PRESETS, type ExamPreset } from "@/lib/presets";

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

export default function ExamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ slug }) => {
      api(`/api/templates/${slug}`)
        .then(r => {
          if (r.ok) setExam(r.data);
          else setError(r.data.error ?? "Exam not found");
        })
        .catch(() => setError("Failed to load exam"))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) return <div className="page"><p>Loading…</p></div>;
  if (error || !exam) return <div className="page"><h1>Exam not found</h1><p>{error}</p></div>;

  const modeLabel = exam.display_mode === "highlighted" ? "Highlighted" : exam.display_mode === "unhighlighted" ? "Unhighlighted" : "Paper to screen";
  const bsLabel = exam.backspace === "full" ? "Backspace on" : exam.backspace === "word" ? "Current word only" : "Disabled";

  return (
    <div className="page">
      <nav className="crumbs"><a href="/">Home</a> / <a href="/exams">Exams</a> / {exam.name}</nav>

      <h1>{exam.name}</h1>
      <p className="hint">{exam.language === "hi" ? "हिंदी" : "English"} · {Math.round(exam.duration_sec / 60)} minutes · {modeLabel} · {bsLabel}</p>

      {exam.description && <p>{exam.description}</p>}
      {exam.qualifying_wpm && <p><strong>Qualifying net WPM:</strong> {exam.qualifying_wpm}</p>}

      <div className="sim-card">
        <h2>Exam Rules</h2>
        <ul className="rules-list">
          <li><strong>Duration:</strong> {Math.round(exam.duration_sec / 60)} minutes</li>
          <li><strong>Language:</strong> {exam.language === "hi" ? "हिंदी" : "English"}</li>
          <li><strong>Display mode:</strong> {modeLabel}</li>
          <li><strong>Backspace:</strong> {bsLabel}</li>
          <li><strong>Scoring:</strong> {exam.scoring?.label ?? "Standard"}</li>
        </ul>

        <a className="go" href={`/practice/${exam.slug}`}>
          Start Practice
        </a>
      </div>
    </div>
  );
}