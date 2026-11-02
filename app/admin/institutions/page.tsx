"use client";
import { useCallback, useEffect, useState } from "react";
import { api, fmtDate, post } from "@/lib/clientApi";

export default function AdminInstitutions() {
  const [rows, setRows] = useState<any[]>([]); const [subs, setSubs] = useState<any[]>([]); const [denied, setDenied] = useState(false); const [msg, setMsg] = useState(""); const [planId, setPlanId] = useState("institute_basic"); const [days, setDays] = useState(30);
  const load = useCallback(async () => { const [r, s] = await Promise.all([api("/api/admin/institutions"), api("/api/admin/subscriptions?kind=institute")]); if (r.status === 403 || s.status === 403) return setDenied(true); if (r.ok) setRows(r.data); if (s.ok) setSubs(s.data); }, []);
  useEffect(() => { load(); }, [load]);
  const set = async (id: string, status: string) => { const r = await post("/api/admin/institutions", { id, status }); setMsg(r.ok ? "Updated." : r.data.error ?? "Failed."); load(); };
  const grant = async (institutionId: string) => { const r = await post("/api/admin/subscriptions", { kind: "institute", institutionId, planId, days }); setMsg(r.ok ? "Institute subscription granted." : r.data.error ?? "Grant failed."); if (r.ok) load(); };\n  const revoke = async (institutionId: string) => { if (!confirm("Revoke this institute subscription now?")) return; const r = await post("/api/admin/subscriptions", { kind: "institute", institutionId, revoke: true }); setMsg(r.ok ? "Institute subscription revoked." : r.data.error ?? "Revoke failed."); if (r.ok) load(); };\n  if (denied) return <div className="page"><h1>Institutes</h1><p>Admin access is required.</p></div>;
  return (
    <div className="page admin">
      <h1>Institutes</h1><p><a href="/admin">Back to admin</a></p>
      {msg && <p className="flash-msg" role="status">{msg}</p>}
      <section className="form"><h2>Manual institute subscription override</h2><p className="hint">Administrative grant only. This does not represent a Cashfree payment or customer purchase.</p><label>Plan<select value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="institute_basic">Institute Basic</option><option value="institute_growth">Institute Growth</option></select></label><label>Duration in days<input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label></section>\n      <div className="tbl"><table><thead><tr><th>Institute</th><th>Place</th><th>Owner</th><th>Phone</th><th>Students</th><th>Status</th><th>Subscription</th><th></th></tr></thead><tbody>
        {rows.map((i) => <tr key={i.id}><td>{i.name}<br /><span className="hint">{fmtDate(i.created_at)}</span></td><td>{i.city}, {i.state}</td><td>{i.owner_email}</td><td>{i.phone}</td><td>{i.students}</td><td><b>{i.status}</b></td>
          <td>{i.status !== "approved" && <button className="link" onClick={() => set(i.id, "approved")}>Approve</button>} {i.status === "approved" && <button className="link" onClick={() => confirm(`Suspend ${i.name}? Its students lose unlimited tests.`) && set(i.id, "suspended")}>Suspend</button>}</td></tr>)}
        {!rows.length && <tr><td colSpan={8}>No institutes have registered yet.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
