"use client";
import { useCallback, useEffect, useState } from "react";
import Leaderboard from "@/components/Leaderboard";
import { api, del, fmtDate, post } from "@/lib/clientApi";

type Tab = "overview" | "students" | "batches" | "assignments" | "board" | "team";
const TABS: [Tab, string][] = [["overview", "Overview"], ["students", "Students"], ["batches", "Batches"], ["assignments", "Assignments"], ["board", "Leaderboards"], ["team", "Team"]];

export default function InstitutePanel() {
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [msg, setMsg] = useState("");
  const reload = useCallback(() => { api("/api/institution").then((r) => setMe(r.data)); }, []);
  useEffect(reload, [reload]);
  const say = (r: { ok: boolean; data: any }, okText: string) => setMsg(r.ok ? okText : r.data.error ?? "Something went wrong.");

  if (!me) return <div className="page"><p>Loading…</p></div>;
  if (!me.signedIn) return <div className="page"><h1>Institute panel</h1><p><a href="/login?next=/institution">Sign in</a> to manage your typing centre.</p></div>;
  const inst = me.institute;
  if (!inst) return <div className="page"><h1>Institute panel</h1><p>Run a typing centre? <a href="/institution/register">Register it here</a>.</p><p>A student? <a href="/join">Join with your institute’s code</a>.</p></div>;
  if (inst.role === "student") return <div className="page"><h1>{inst.name}</h1><p>You are a student here. <a href="/join">See your assignments</a>.</p></div>;
  if (inst.status !== "approved") return <div className="page"><h1>{inst.name}</h1><p className="flash-msg">{inst.status === "pending" ? "Your institute is waiting for admin approval. You will get your join code once it is approved." : "This institute is suspended. Contact the site admin."}</p></div>;

  return (
    <div className="page admin">
      <h1>{inst.name}</h1>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMsg(""); }}>{l}</button>)}</div>
      {msg && <p className="flash-msg" role="status">{msg}</p>}
      {tab === "overview" && <Overview me={me} />}
      {tab === "students" && <Students inst={inst} say={say} reload={reload} />}
      {tab === "batches" && <Batches say={say} />}
      {tab === "assignments" && <Assignments say={say} />}
      {tab === "board" && <Boards />}
      {tab === "team" && <Team me={me} say={say} reload={reload} />}
    </div>
  );
}

function Overview({ me }: { me: any }) {
  const s = me.stats ?? {}; const code = me.institute.joinCode;
  return (<>
    <div className="tiles">
      <div><b>{s.students ?? 0}</b><span>Students</span></div><div><b>{s.active_week ?? 0}</b><span>Practised this week</span></div>
      <div><b>{s.tests_week ?? 0}</b><span>Tests this week</span></div><div><b>{s.avg_wpm ?? "–"}</b><span>Average net WPM (30 days)</span></div>
    </div>
    <h2>Student join code</h2>
    <p className="code" aria-label="Join code">{code}</p>
    <p className="hint">Give this code to students. They sign up on the site, open the Join page and enter it. They then get unlimited tests, your assignments and your institute leaderboard.</p>
    <p><button className="go alt" onClick={() => navigator.clipboard?.writeText(code)}>Copy code</button>{" "}<a className="go" href="/api/institution/report">Download progress report (CSV)</a></p>
  </>);
}

function Students({ inst, say, reload }: { inst: any; say: any; reload: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null); const [q, setQ] = useState(""); const [email, setEmail] = useState("");
  const [open, setOpen] = useState<any>(null); const [att, setAtt] = useState<any[]>([]);
  const load = useCallback(() => { api("/api/institution/students").then((r) => setRows(r.ok ? r.data : [])); }, []);
  useEffect(load, [load]);
  const show = async (s: any) => { if (open?.id === s.id) return setOpen(null); setOpen(s); const r = await api(`/api/institution/students?userId=${s.id}`); setAtt(r.ok ? r.data : []); };
  const add = async () => { const r = await post("/api/institution/members", { email, role: "student" }); say(r, "Student added."); if (r.ok) { setEmail(""); load(); reload(); } };
  const remove = async (s: any) => { if (confirm(`Remove ${s.name ?? s.email} from your institute?`)) { const r = await del(`/api/institution/members?userId=${s.id}`); say(r, "Student removed."); load(); reload(); } };
  const shown = (rows ?? []).filter((s) => `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase()));
  return (<>
    <div className="form row"><label>Add student by email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="They must have signed up" /></label><button className="go" disabled={!email} onClick={add}>Add</button>
      <label>Search<input value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
    <div className="tbl"><table><thead><tr><th>Student</th><th>Batches</th><th>Tests</th><th>Best WPM</th><th>Accuracy (last 10)</th><th>Days active (30)</th><th>Last practice</th><th></th></tr></thead><tbody>
      {shown.map((s) => (<>
        <tr key={s.id}><td><button className="link" onClick={() => show(s)}>{s.name ?? s.email}</button></td><td>{s.batches}</td><td>{s.tests}</td><td>{s.best_wpm ?? "–"}</td><td>{s.recent_accuracy ? `${s.recent_accuracy}%` : "–"}</td><td>{s.active_days_30}</td><td>{fmtDate(s.last_active) || "Never"}</td><td><button className="link" onClick={() => remove(s)}>Remove</button></td></tr>
        {open?.id === s.id && <tr key={s.id + "d"}><td colSpan={8}>{att.length ? <ul className="wl">{att.map((a) => <li key={a.id}><a href={`/results/${a.id}`}>{fmtDate(a.created_at)}: {a.simulator ?? "Free practice"}, {a.net_wpm} WPM, {a.accuracy}%</a>{a.flagged ? " (flagged)" : ""}</li>)}</ul> : "No attempts yet."}</td></tr>}
      </>))}
      {rows && !shown.length && <tr><td colSpan={8}>No students yet. Share your join code from the Overview tab.</td></tr>}
    </tbody></table></div>
  </>);
}

function Batches({ say }: { say: any }) {
  const [batches, setBatches] = useState<any[]>([]); const [students, setStudents] = useState<any[]>([]); const [name, setName] = useState("");
  const [edit, setEdit] = useState<string | null>(null); const [sel, setSel] = useState<string[]>([]);
  const load = useCallback(() => { api("/api/institution/batches").then((r) => r.ok && setBatches(r.data)); api("/api/institution/students").then((r) => r.ok && setStudents(r.data)); }, []);
  useEffect(load, [load]);
  const create = async () => { const r = await post("/api/institution/batches", { name }); say(r, "Batch created."); if (r.ok) { setName(""); load(); } };
  const save = async () => { const r = await post("/api/institution/batches", { batchId: edit, userIds: sel }); say(r, "Batch updated."); if (r.ok) { setEdit(null); load(); } };
  const remove = async (id: string) => { if (confirm("Delete this batch? Assignments for it are deleted too.")) { await del(`/api/institution/batches?id=${id}`); load(); } };
  return (<>
    <div className="form row"><label>New batch<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning 7 AM SSC" /></label><button className="go" disabled={!name.trim()} onClick={create}>Create</button></div>
    {batches.map((b) => (
      <section key={b.id} className="card-p">
        <h3>{b.name} <span className="hint">{b.member_ids.length} students</span></h3>
        {edit === b.id ? (<>
          <div className="checks">{students.map((s) => <label key={s.id} className="chk"><input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} /> {s.name ?? s.email}</label>)}</div>
          <button className="go" onClick={save}>Save members</button> <button className="link" onClick={() => setEdit(null)}>Cancel</button></>) : (
          <p><button className="link" onClick={() => { setEdit(b.id); setSel(b.member_ids); }}>Choose students</button> · <button className="link" onClick={() => remove(b.id)}>Delete</button></p>)}
      </section>))}
    {!batches.length && <p>No batches yet. Batches let you give different tests to different groups.</p>}
  </>);
}

function Assignments({ say }: { say: any }) {
  const [list, setList] = useState<any[]>([]); const [sims, setSims] = useState<any[]>([]); const [batches, setBatches] = useState<any[]>([]);
  const [f, setF] = useState({ title: "", templateSlug: "", batchId: "", dueAt: "" }); const [open, setOpen] = useState<string | null>(null); const [prog, setProg] = useState<any[]>([]);
  const load = useCallback(() => { api("/api/institution/assignments").then((r) => r.ok && setList(r.data)); }, []);
  useEffect(() => { load(); api("/api/simulators").then((r) => r.ok && setSims(r.data)); api("/api/institution/batches").then((r) => r.ok && setBatches(r.data)); }, [load]);
  const create = async () => { const r = await post("/api/institution/assignments", { ...f, batchId: f.batchId || undefined, dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : undefined }); say(r, "Assignment created."); if (r.ok) { setF({ title: "", templateSlug: "", batchId: "", dueAt: "" }); load(); } };
  const show = async (id: string) => { if (open === id) return setOpen(null); setOpen(id); const r = await api(`/api/institution/assignments?id=${id}`); setProg(r.ok ? r.data : []); };
  const remove = async (id: string) => { if (confirm("Delete this assignment?")) { await del(`/api/institution/assignments?id=${id}`); load(); } };
  return (<>
    <div className="form"><h2>Set a test</h2>
      <label>Title<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Week 3 speed test" /></label>
      <label>Simulator<select value={f.templateSlug} onChange={(e) => setF({ ...f, templateSlug: e.target.value })}><option value="">Choose…</option>{sims.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
      <label>For<select value={f.batchId} onChange={(e) => setF({ ...f, batchId: e.target.value })}><option value="">All students</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>Due date (optional)<input type="datetime-local" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} /></label>
      <button className="go" disabled={!f.title.trim() || !f.templateSlug} onClick={create}>Assign</button></div>
    <h2>Assignments</h2>
    {list.map((a) => (
      <section key={a.id} className="card-p">
        <h3>{a.title}</h3>
        <p className="hint">{a.sim_name} · {a.batch_name ?? "All students"}{a.due_at ? ` · due ${fmtDate(a.due_at)}` : ""}</p>
        <div className="progress" role="img" aria-label={`${a.completed} of ${a.assigned} done`}><i style={{ width: `${a.assigned ? (a.completed / a.assigned) * 100 : 0}%` }} /></div>
        <p>{a.completed} of {a.assigned} done{a.avg_wpm ? ` · average ${a.avg_wpm} net WPM` : ""}</p>
        <p><button className="link" onClick={() => show(a.id)}>{open === a.id ? "Hide students" : "See each student"}</button> · <button className="link" onClick={() => remove(a.id)}>Delete</button></p>
        {open === a.id && <div className="tbl"><table><thead><tr><th>Student</th><th>Best WPM</th><th>Attempts</th><th></th></tr></thead><tbody>
          {prog.map((s) => <tr key={s.id}><td>{s.name ?? s.email}</td><td>{s.best_wpm ?? (s.attempts ? "flagged" : "Not done")}</td><td>{s.attempts}</td><td>{s.best_result_id && <a href={`/results/${s.best_result_id}`}>View</a>}</td></tr>)}</tbody></table></div>}
      </section>))}
    {!list.length && <p>No assignments yet.</p>}
  </>);
}

function Boards() {
  const [sims, setSims] = useState<any[]>([]); const [slug, setSlug] = useState("");
  useEffect(() => { api("/api/simulators").then((r) => { if (r.ok) { setSims(r.data); setSlug(r.data[0]?.slug ?? ""); } }); }, []);
  return (<><label className="inline">Simulator <select value={slug} onChange={(e) => setSlug(e.target.value)}>{sims.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
    {slug && <Leaderboard key={slug} slug={slug} defaultScope="institute" />}</>);
}

function Team({ me, say, reload }: { me: any; say: any; reload: () => void }) {
  const [email, setEmail] = useState(""); const owner = me.institute.role === "owner";
  const add = async () => { const r = await post("/api/institution/members", { email, role: "teacher" }); say(r, "Teacher added."); if (r.ok) { setEmail(""); reload(); } };
  const remove = async (t: any) => { if (confirm(`Remove ${t.name ?? t.email}?`)) { const r = await del(`/api/institution/members?userId=${t.id}`); say(r, "Removed."); reload(); } };
  return (<>
    <div className="tbl"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>
      {me.team.map((t: any) => <tr key={t.id}><td>{t.name}</td><td>{t.email}</td><td>{t.role}</td><td>{owner && t.role !== "owner" && <button className="link" onClick={() => remove(t)}>Remove</button>}</td></tr>)}</tbody></table></div>
    {owner ? <div className="form row"><label>Add a teacher by email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="They must have signed up" /></label><button className="go" disabled={!email} onClick={add}>Add teacher</button></div>
      : <p className="hint">Only the owner can add or remove teachers.</p>}
    <p className="hint">Teachers can see students and results, make batches and set assignments. They cannot change the team.</p>
  </>);
}
