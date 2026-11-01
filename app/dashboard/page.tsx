"use client";
import { useEffect, useState } from "react";
import { LineChart } from "@/components/charts";
import ResultAnalysis from "@/components/ResultAnalysis";
import { api, fmtDate } from "@/lib/clientApi";

interface Row { id: string; created_at: string; net_wpm: string; accuracy: string; simulator: string | null }

export default function Dashboard() {
  const [hist, setHist] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState("");
  const [last, setLast] = useState<any>(null);
  useEffect(() => { try { const raw = sessionStorage.getItem("tsz:last"); if (raw) setLast(JSON.parse(raw)); } catch {} }, []);
  useEffect(() => { api("/api/results").then((r) => (r.ok ? setHist(r.data) : setMsg(r.status === 401 ? "Sign in to see your progress." : r.data.error ?? "Could not load results."))); }, []);

  if (msg) return <div className="page results-page"><header className="results-page-heading"><span className="results-eyebrow">YOUR WORKSPACE</span><h1>My results</h1><p>Review completed attempts and track your typing progress.</p></header><section className="results-notice" role="status"><p>{msg} {msg.startsWith("Sign in") && <a href="/login">Sign in</a>}</p><a className="results-coach-link" href="/coach">Open Intelligent Typing Coach <span aria-hidden="true">→</span></a></section>{last && <section className="results-last-session"><h2>Your last practice test</h2><ResultAnalysis reference={last.reference} events={last.events} score={last.score} /></section>}</div>;
  if (!hist) return <div className="page results-page"><div className="results-loading" role="status" aria-live="polite"><span className="results-loading-mark" aria-hidden="true" /><strong>Loading your results</strong><p>Retrieving your saved practice attempts…</p></div></div>;

  const old = [...hist].reverse();
  const averageWpm = hist.length ? hist.reduce((sum, item) => sum + Number(item.net_wpm || 0), 0) / hist.length : 0;
  const averageAccuracy = hist.length ? hist.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / hist.length : 0;
  const bestWpm = hist.length ? Math.max(...hist.map((item) => Number(item.net_wpm || 0))) : 0;
  const latest = hist[0];
  const previous = hist[1];
  const change = latest && previous ? Number(latest.net_wpm) - Number(previous.net_wpm) : null;

  return (
    <main className="page results-page results-dashboard">
      <header className="results-page-heading results-dashboard-heading">
        <div><span className="results-eyebrow">YOUR PERFORMANCE CENTRE</span><h1>My results</h1><p>A clear view of your typing progress, saved attempts and performance trends.</p></div>
        <a className="results-primary-action" href="/simulators">Start an exam <span aria-hidden="true">→</span></a>
      </header>
      {hist.length === 0 ? <section className="results-empty"><span aria-hidden="true">⌨</span><h2>Your progress starts here</h2><p>Complete an exam simulator or a practice test to see your speed, accuracy and attempt history here.</p><a className="results-coach-link" href="/simulators">Explore exam simulators <span aria-hidden="true">→</span></a></section> : (<>
        <section className="results-overview-grid" aria-label="Typing performance overview">
          <article className="results-overview-card"><span className="results-overview-icon">⌨</span><small>Total attempts</small><strong>{hist.length}</strong><span>Saved practice sessions</span></article>
          <article className="results-overview-card"><span className="results-overview-icon">↗</span><small>Best net speed</small><strong>{bestWpm.toFixed(1)} <em>WPM</em></strong><span>Personal speed record</span></article>
          <article className="results-overview-card"><span className="results-overview-icon">◎</span><small>Average net speed</small><strong>{averageWpm.toFixed(1)} <em>WPM</em></strong><span>Across saved attempts</span></article>
          <article className="results-overview-card"><span className="results-overview-icon">✓</span><small>Average accuracy</small><strong>{averageAccuracy.toFixed(1)}<em>%</em></strong><span>Across saved attempts</span></article>
        </section>
        <section className="results-chart-panel">
          <div className="results-section-heading"><div><span className="results-eyebrow">PROGRESS TRACKER</span><h2>Performance trend</h2><p>Follow your net speed and accuracy across completed attempts.</p></div><span className="results-count-pill">{hist.length} {hist.length === 1 ? "attempt" : "attempts"}</span></div>
          {hist.length > 1 ? <LineChart labels={old.map((h) => fmtDate(h.created_at).slice(0, 6))} series={[{ label: "Net WPM", color: "#55d9f2", values: old.map((h) => Number(h.net_wpm)) }, { label: "Accuracy %", color: "#a78bfa", values: old.map((h) => Number(h.accuracy)) }]} yMax={Math.max(100, ...old.map((h) => Number(h.net_wpm)))} /> : <p className="results-single-chart-note">Complete another test to unlock your performance trend chart.</p>}
        </section>
        <section className="results-attempts-section">
          <div className="results-section-heading"><div><span className="results-eyebrow">SAVED HISTORY</span><h2>Recent attempts</h2><p>Open any attempt for a detailed review of your typed text and mistakes.</p></div><span className="results-count-pill">{hist.length} total</span></div>
          {latest && <div className="results-latest-strip"><div><small>LATEST ATTEMPT</small><strong>{latest.simulator ?? "Free practice"}</strong><span>{fmtDate(latest.created_at)}</span></div><div><small>NET SPEED</small><strong>{latest.net_wpm} WPM</strong></div><div><small>ACCURACY</small><strong>{latest.accuracy}%</strong></div><div><small>CHANGE VS PREVIOUS</small><strong className={change === null ? "" : change >= 0 ? "results-change-positive" : "results-change-negative"}>{change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)} WPM`}</strong></div><a href={`/results/${latest.id}`}>View report <span aria-hidden="true">→</span></a></div>}
          <div className="tbl results-history-table" role="region" aria-label="Saved typing attempts" tabIndex={0}><table><caption className="results-table-caption">Saved attempts, newest first</caption><thead><tr><th>Date</th><th>Simulator</th><th>Net WPM</th><th>Accuracy</th><th>Change</th><th>Report</th></tr></thead><tbody>
            {hist.map((h, i) => { const prev = hist[i + 1]; const d = prev ? Number(h.net_wpm) - Number(prev.net_wpm) : null;
              return <tr key={h.id}><td>{fmtDate(h.created_at)}</td><td>{h.simulator ?? "Free practice"}</td><td><b>{h.net_wpm}</b></td><td>{h.accuracy}%</td><td>{d === null ? "—" : <span className={d >= 0 ? "results-change-positive" : "results-change-negative"}>{d > 0 ? "+" : ""}{d.toFixed(1)}</span>}</td><td><a href={`/results/${h.id}`}>Open report →</a></td></tr>; })}
          </tbody></table></div>
        </section>
      </>)}
    </main>
  );
}
