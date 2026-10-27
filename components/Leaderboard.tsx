"use client";
import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/clientApi";

interface Entry { result_id: string; user_id: string; name: string | null; net_wpm: string; accuracy: string; created_at: string; rank: number; total: number }

/** Ranking of every student who practised this simulator. Best valid attempt per student. */
export default function Leaderboard({ slug, defaultScope = "all" }: { slug: string; defaultScope?: "all" | "institute" }) {
  const [scope, setScope] = useState(defaultScope);
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState<{ me: string | null; entries: Entry[] } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setData(null); setErr("");
    api(`/api/leaderboard?simulator=${encodeURIComponent(slug)}&period=${period}&scope=${scope}`).then((r) => (r.ok ? setData(r.data) : setErr(r.data.error ?? "Could not load the leaderboard.")));
  }, [slug, scope, period]);

  const mine = data?.entries.find((e) => e.user_id === data.me);
  return (
    <div className="lb">
      <div className="bar">
        <div className="tabs" role="tablist" aria-label="Who to rank">
          <button role="tab" aria-selected={scope === "all"} onClick={() => setScope("all")}>All students</button>
          <button role="tab" aria-selected={scope === "institute"} onClick={() => setScope("institute")}>My institute</button>
        </div>
        <label className="inline">Period <select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="all">All time</option><option value="month">Last 30 days</option><option value="week">Last 7 days</option></select></label>
      </div>
      {err && <p className="hint">{err}</p>}
      {!err && !data && <p className="hint">Loading…</p>}
      {data && (<>
        {mine ? <p className="rankline">Your rank: <b>#{mine.rank}</b> of {mine.total} with {mine.net_wpm} net WPM.</p> : data.me ? <p className="hint">Finish a full-length test on this simulator to join the ranking.</p> : <p className="hint"><a href="/login">Sign in</a> and finish a test to appear here.</p>}
        <div className="tbl"><table><thead><tr><th>Rank</th><th>Student</th><th>Net WPM</th><th>Accuracy</th><th>Date</th></tr></thead><tbody>
          {data.entries.map((e) => <tr key={e.user_id} className={e.user_id === data.me ? "me" : ""}><td><b>{e.rank}</b></td><td>{e.name ?? "Student"}{e.user_id === data.me ? " (you)" : ""}</td><td><b>{e.net_wpm}</b></td><td>{e.accuracy}%</td><td>{fmtDate(e.created_at)}</td></tr>)}
          {!data.entries.length && <tr><td colSpan={5}>No ranked attempts yet. Be the first.</td></tr>}
        </tbody></table></div>
        <p className="hint">Only full-length attempts count. Each student appears once, with their best score. Ties share a rank and are ordered by accuracy.</p>
      </>)}
    </div>
  );
}
