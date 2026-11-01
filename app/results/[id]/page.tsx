"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ResultAnalysis from "@/components/ResultAnalysis";
import { api, fmtDate } from "@/lib/clientApi";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api(`/api/results/${id}`).then((r) => (r.ok ? setD(r.data) : setErr(r.status === 401 ? "Sign in to see this result." : r.data.error ?? "Could not load this result."))); }, [id]);

  if (err) return <div className="page result-page"><section className="result-state-card"><span className="result-kicker">TYPINGSKILLZONE · RESULTS</span><h1>Result unavailable</h1><p>{err} {err.startsWith("Sign in") && <a href="/login">Sign in</a>}</p></section></div>;
  if (!d) return <div className="page result-page"><section className="result-state-card" role="status"><span className="result-kicker">TYPINGSKILLZONE · RESULTS</span><h1>Preparing your report</h1><p>Loading your saved typing result…</p></section></div>;
  const s = d.score;
  return (
    <div className="page result-page">
      <header className="result-hero">
        <div><span className="result-kicker">TYPINGSKILLZONE · PERFORMANCE REPORT</span><p className="result-context">{d.studentName ? `${d.studentName} · ` : ""}{d.simulator ? <a href={`/simulators/${d.simulator.slug}`}>{d.simulator.name}</a> : "Free practice"} · {fmtDate(d.createdAt)}</p>
        <h1>{s.passed === null ? "Your result" : s.passed ? "Qualified on this run" : "Below the qualifying mark"}</h1>
        <p className="result-subtitle">Review your speed, accuracy and exam-specific evaluation below.</p></div>
        <span className={`result-outcome ${s.passed === true ? "is-pass" : s.passed === false ? "is-fail" : "is-practice"}`}>{s.passed === null ? "PRACTICE RESULT" : s.passed ? "QUALIFIED" : "NOT QUALIFIED"}</span>
      </header>
      {d.flagged && <p className="err" role="alert">This attempt is kept off the leaderboards because its timing or speed looked unusual.</p>}
      {d.rank && <p className="rankline">Rank <b>#{d.rank}</b> of {d.participants} students on this simulator. <a href={`/simulators/${d.simulator.slug}`}>See the leaderboard</a></p>}
      <ResultAnalysis reference={d.reference} events={d.events} score={s} evaluation={d.evaluation} />
      <nav className="result-actions" aria-label="Result actions"><a className="go" href={d.simulator ? `/simulators/${d.simulator.slug}` : "/simulators"}>Practise again <span aria-hidden="true">→</span></a><a className="result-secondary-action" href="/dashboard">My dashboard</a><a className="result-secondary-action" href="/simulators">All simulators</a></nav>
    </div>
  );
}
