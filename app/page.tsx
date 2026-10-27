"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/clientApi";

interface ExamCard {
  slug: string;
  name: string;
  language: "en" | "hi";
  duration_sec: number;
  display_mode: string;
  backspace: string;
  scoring: any;
  description?: string;
  participants?: number;
}

export default function Home() {
  const [exams, setExams] = useState<ExamCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/templates")
      .then(r => {
        if (r.ok) setExams(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const modeLabel = (mode: string) =>
    mode === "highlighted" ? "Highlighted" : mode === "unhighlighted" ? "Unhighlighted" : "Paper to screen";

  const bsLabel = (bs: string) =>
    bs === "full" ? "Backspace on" : bs === "word" ? "Current word only" : "Disabled";

  return (
    <div className="page home">
      <section className="hero">
        <h1>Master typing for government exams</h1>
        <p>Practice English and Hindi typing tests with exam-specific rules, scoring, and real-time feedback. SSC, RRB, Delhi Police, Courts, and more.</p>
        <div className="cta-group">
          <a href="/simulators" className="go">Explore Exam Simulators</a>
          <a href="/test" className="go alt">Free Practice Test</a>
        </div>
      </section>

      <section className="features-grid">
        <div className="feature-card">
          <h3>🎯 Exam-Specific Practice</h3>
          <p>Each simulator uses the exact timing, display mode, and scoring rules from official exams.</p>
        </div>
        <div className="feature-card">
          <h3>📊 Performance Analytics</h3>
          <p>Track your progress with detailed speed charts, accuracy trends, and mistake analysis.</p>
        </div>
        <div className="feature-card">
          <h3>📚 Centralized Passage Library</h3>
          <p>Daily fresh passages in English and Hindi, with 14-day archive and searchable collection.</p>
        </div>
        <div className="feature-card">
          <h3>🏆 Leaderboards</h3>
          <p>Compete with other students on each simulator. Track your rank and improvement.</p>
        </div>
      </section>

      <section className="exam-section">
        <h2>Popular Exam Simulators</h2>
        {loading ? (
          <p>Loading exams...</p>
        ) : exams.length === 0 ? (
          <p>No exams configured yet. Check back soon.</p>
        ) : (
          <div className="sim-grid">
            {exams.slice(0, 6).map(exam => (
              <a key={exam.slug} className="sim-card" href={`/simulators/${exam.slug}`}>
                <h3>{exam.name}</h3>
                <p className="meta">{exam.language === "hi" ? "हिंदी" : "English"}</p>
                <ul className="rules-list">
                  <li>{Math.round(exam.duration_sec / 60)} minutes</li>
                  <li>{modeLabel(exam.display_mode)}</li>
                  <li>{bsLabel(exam.backspace)}</li>
                </ul>
                {exam.participants !== undefined && (
                  <p className="meta">{exam.participants} students ranked</p>
                )}
              </a>
            ))}
          </div>
        )}
        <p style={{ textAlign: "center", marginTop: "24px" }}>
          <a href="/simulators" className="go alt">View All Exam Simulators →</a>
        </p>
      </section>

      <section className="cta-section">
        <h2>Ready to start practicing?</h2>
        <p>Join thousands of students preparing for government typing exams.</p>
        <a href="/login" className="go">Create Free Account</a>
      </section>
    </div>
  );
}
