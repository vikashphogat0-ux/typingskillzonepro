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

  if (msg) return <div className="page"><h1>My results</h1><p>{msg} {msg.startsWith("Sign in") && <a href="/login">Sign in</a>}</p>{last && <><h2>Your last practice test</h2><ResultAnalysis reference={last.reference} events={last.events} score={last.score} /></>}</div>;
  if (!hist) return <div className="page"><p>Loading…</p></div>;
  const old = [...hist].reverse();
  return (
    <div className="page">
      <h1>My results</h1>
      {hist.length === 0 ? <p>No tests yet. <a href="/simulators">Try an exam simulator</a>.</p> : (<>
        {hist.length > 1 && <LineChart labels={old.map((h) => fmtDate(h.created_at).slice(0, 6))} series={[{ label: "Net WPM", color: "#c0182b", values: old.map((h) => Number(h.net_wpm)) }, { label: "Accuracy %", color: "#1f7a4d", values: old.map((h) => Number(h.accuracy)) }]} yMax={Math.max(100, ...old.map((h) => Number(h.net_wpm)))} />}
        <h2>Attempts</h2>
        <p className="hint">Open any attempt to see your text against the reference, with every mistake marked.</p>
        <div className="tbl"><table><thead><tr><th>Date</th><th>Simulator</th><th>Net WPM</th><th>Accuracy</th><th>Change</th><th></th></tr></thead><tbody>
          {hist.map((h, i) => { const prev = hist[i + 1]; const d = prev ? Number(h.net_wpm) - Number(prev.net_wpm) : null;
            return <tr key={h.id}><td>{fmtDate(h.created_at)}</td><td>{h.simulator ?? "Free practice"}</td><td><b>{h.net_wpm}</b></td><td>{h.accuracy}%</td><td>{d === null ? "" : d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1)}</td><td><a href={`/results/${h.id}`}>Compare</a></td></tr>; })}
        </tbody></table></div></>)}
    </div>
  );
}
