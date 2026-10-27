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

  if (err) return <div className="page"><h1>Result</h1><p>{err} {err.startsWith("Sign in") && <a href="/login">Sign in</a>}</p></div>;
  if (!d) return <div className="page"><p>Loading your result…</p></div>;
  const s = d.score;
  return (
    <div className="page">
      <p className="hint">{d.studentName ? `${d.studentName} · ` : ""}{d.simulator ? <a href={`/simulators/${d.simulator.slug}`}>{d.simulator.name}</a> : "Free practice"} · {fmtDate(d.createdAt)}</p>
      <h1>{s.passed === null ? "Your result" : s.passed ? "Qualified on this run" : "Below the qualifying mark"}</h1>
      {d.flagged && <p className="err" role="alert">This attempt is kept off the leaderboards because its timing or speed looked unusual.</p>}
      {d.rank && <p className="rankline">Rank <b>#{d.rank}</b> of {d.participants} students on this simulator. <a href={`/simulators/${d.simulator.slug}`}>See the leaderboard</a></p>}
      <ResultAnalysis reference={d.reference} events={d.events} score={s} />
      <p><a className="go" href={d.simulator ? `/simulators/${d.simulator.slug}` : "/simulators"}>Try again</a></p>
    </div>
  );
}
