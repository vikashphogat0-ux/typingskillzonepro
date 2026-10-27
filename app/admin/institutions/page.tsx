"use client";
import { useCallback, useEffect, useState } from "react";
import { api, fmtDate, post } from "@/lib/clientApi";

export default function AdminInstitutions() {
  const [rows, setRows] = useState<any[]>([]); const [denied, setDenied] = useState(false); const [msg, setMsg] = useState("");
  const load = useCallback(async () => { const r = await api("/api/admin/institutions"); if (r.status === 403) return setDenied(true); if (r.ok) setRows(r.data); }, []);
  useEffect(() => { load(); }, [load]);
  const set = async (id: string, status: string) => { const r = await post("/api/admin/institutions", { id, status }); setMsg(r.ok ? "Updated." : r.data.error ?? "Failed."); load(); };
  if (denied) return <div className="page"><h1>Institutes</h1><p>Admin access is required.</p></div>;
  return (
    <div className="page admin">
      <h1>Institutes</h1><p><a href="/admin">Back to admin</a></p>
      {msg && <p className="flash-msg" role="status">{msg}</p>}
      <div className="tbl"><table><thead><tr><th>Institute</th><th>Place</th><th>Owner</th><th>Phone</th><th>Students</th><th>Status</th><th></th></tr></thead><tbody>
        {rows.map((i) => <tr key={i.id}><td>{i.name}<br /><span className="hint">{fmtDate(i.created_at)}</span></td><td>{i.city}, {i.state}</td><td>{i.owner_email}</td><td>{i.phone}</td><td>{i.students}</td><td><b>{i.status}</b></td>
          <td>{i.status !== "approved" && <button className="link" onClick={() => set(i.id, "approved")}>Approve</button>} {i.status === "approved" && <button className="link" onClick={() => confirm(`Suspend ${i.name}? Its students lose unlimited tests.`) && set(i.id, "suspended")}>Suspend</button>}</td></tr>)}
        {!rows.length && <tr><td colSpan={7}>No institutes have registered yet.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
