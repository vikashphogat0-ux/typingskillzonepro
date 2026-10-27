"use client";
import { useEffect, useState } from "react";
import { api, fmtDate, post } from "@/lib/clientApi";

export default function Join() {
  const [me, setMe] = useState<any>(null); const [items, setItems] = useState<any[]>([]); const [code, setCode] = useState(""); const [err, setErr] = useState("");
  const load = () => { api("/api/institution").then((r) => { setMe(r.data); if (r.data?.institute) api("/api/my/assignments").then((a) => a.ok && setItems(a.data)); }); };
  useEffect(load, []);
  const join = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); const r = await post("/api/join", { code }); if (r.ok) load(); else setErr(r.data.error ?? "Could not join."); };

  if (!me) return <div className="page"><p>Loading…</p></div>;
  if (!me.signedIn) return <div className="page"><h1>Join your institute</h1><p><a href="/login?next=/join">Sign in</a> or create an account first, then enter your institute’s code.</p></div>;
  if (!me.institute) return (
    <div className="page setup"><h1>Join your institute</h1>
      <form onSubmit={join} className="form"><label>Code from your teacher<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} autoComplete="off" /></label>
        {err && <p className="err" role="alert">{err}</p>}<button className="go" disabled={code.length < 6}>Join</button></form>
      <p className="hint">Own a typing centre? <a href="/institution/register">Register it</a>.</p></div>);
  const inst = me.institute;
  return (
    <div className="page">
      <h1>{inst.name}</h1>
      {inst.role !== "student" && <p><a href="/institution">Open the institute panel</a></p>}
      <p className="hint">As a member you get unlimited saved tests. Your teacher’s assignments are below.</p>
      <h2>Your assignments</h2>
      {items.map((a) => (
        <section key={a.id} className="card-p">
          <h3>{a.title}</h3>
          <p className="hint">{a.sim_name}{a.batch_name ? ` · ${a.batch_name}` : ""}{a.due_at ? ` · due ${fmtDate(a.due_at)}` : ""}</p>
          <p>{a.attempts ? `Best so far: ${a.my_best ?? "flagged"} net WPM in ${a.attempts} attempt${a.attempts === 1 ? "" : "s"}` : "Not started"}</p>
          <a className="go" href={`/simulators/${a.sim_slug}?assignment=${a.id}`}>{a.attempts ? "Try again" : "Start"}</a>
        </section>))}
      {!items.length && <p>No assignments yet. You can still practise on any <a href="/simulators">simulator</a>.</p>}
    </div>
  );
}
