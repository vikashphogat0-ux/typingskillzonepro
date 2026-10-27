"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/clientApi";

interface Simulator {
  slug: string;
  name: string;
  language: "en" | "hi";
  duration_sec: number;
  display_mode: string;
  backspace: string;
  scoring: any;
  description?: string;
  participants?: number;
  my_best?: number;
}

export default function SimulatorsPage() {
  const [sims, setSims] = useState<Simulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"en" | "hi" | "all">("all");

  useEffect(() => {
    api("/api/simulators")
      .then(r => {
        if (r.ok) setSims(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const modeLabel = (mode: string) =>
    mode === "highlighted" ? "Highlighted" : mode === "unhighlighted" ? "Unhighlighted" : "Paper to screen";

  const bsLabel = (bs: string) =>
    bs === "full" ? "Backspace on" : bs === "word" ? "Current word only" : "Disabled";

  const filtered = filter === "all" ? sims : sims.filter(s => s.language === filter);

  return (
    <div className="page">
      <h1>Exam Simulators</h1>
      <p className="hint">Each simulator has fixed exam-specific rules and its own leaderboard. Rules cannot be changed, so every student is ranked fairly. Always verify your exam's official notification.</p>

      <div className="form row">
        <label>Language
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading simulators...</p>
      ) : filtered.length === 0 ? (
        <p>No simulators available. Check back soon.</p>
      ) : (
        <div className="sim-grid">
          {filtered.map(sim => (
            <a key={sim.slug} className="sim-card" href={`/simulators/${sim.slug}`}>
              <h2>{sim.name}</h2>
              <p>{sim.description}</p>
              <ul className="rules-list big">
                <li>{Math.round(sim.duration_sec / 60)} minutes, {sim.language === "hi" ? "हिंदी" : "English"}</li>
                <li>{modeLabel(sim.display_mode)}, {bsLabel(sim.backspace).toLowerCase()}</li>
                {sim.scoring?.qualifyingWpm && <li>Qualifying {sim.scoring.qualifyingWpm} net WPM</li>}
              </ul>
              <p className="meta">
                {sim.participants ?? 0} student{sim.participants === 1 ? "" : "s"} ranked{sim.my_best ? ` · your best ${sim.my_best} WPM` : ""}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}