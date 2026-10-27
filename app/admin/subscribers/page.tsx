"use client";
import { useCallback, useEffect, useState } from "react";

interface Row { email: string; status: string; ends_at: string; is_pro: boolean }

export default function Subscribers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(30);
  const [msg, setMsg] = useState("");
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/subscriptions");
    if (r.status === 403) return setDenied(true);
    if (r.ok) setRows(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (body: object) => {
    const r = await fetch("/api/admin/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Done." : d.error ?? "Failed.");
    if (r.ok) load();
  };

  if (denied) return <div className="page"><h1>Subscribers</h1><p>Admin access is required.</p></div>;
  return (
    <div className="page admin">
      <h1>Subscribers</h1>
      <p><a href="/admin">Back to admin</a></p>
      {msg && <p className="flash-msg" role="status">{msg}</p>}
      <div className="form">
        <label>User email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Days of Pro to add<input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
        <div><button className="go" disabled={!email} onClick={() => act({ email, days })}>Grant Pro</button>{" "}
          <button className="link" disabled={!email} onClick={() => confirm(`End Pro for ${email} now?`) && act({ email, revoke: true })}>End Pro now</button></div>
      </div>
      <h2>Pro accounts ({rows.length})</h2>
      <div className="tbl"><table><thead><tr><th>Email</th><th>Status</th><th>Ends</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.email}><td>{r.email}</td><td>{r.is_pro ? "Active" : r.status === "cancelled" ? "Ended by admin" : "Expired"}</td><td>{new Date(r.ends_at).toLocaleDateString("en-IN")}</td></tr>)}
        {!rows.length && <tr><td colSpan={3}>No Pro accounts yet.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
