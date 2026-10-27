"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/clientApi";
import { fmtDate } from "@/lib/clientApi";

export default function InstitutionsPage() {
  const [institutes, setInstitutes] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/admin/institutions")
      .then(r => {
        if (r.status === 403) { setMsg("Admin access required."); }
        else if (r.ok) setInstitutes(r.data);
        else setMsg(r.data.error ?? "Could not load institutes.");
      })
      .catch(() => setMsg("Failed to load institutes."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Loading…</p></div>;
  if (!institutes) return <div className="page"><p>{msg}</p></div>;

  return (
    <div className="page admin">
      <h1>Institutes</h1>
      <nav className="crumbs"><a href="/admin">Admin Home</a> / Institutes</nav>
      <div className="tbl"><table>
        <thead>
          <tr>
            <th>Institute</th>
            <th>Place</th>
            <th>Owner</th>
            <th>Phone</th>
            <th>Students</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {institutes.map((inst: any) => (
            <tr key={inst.id}>
              <td>{inst.name}<br /><span className="hint">{fmtDate(inst.created_at)}</span></td>
              <td>{inst.city ?? ""}, {inst.state ?? ""}</td>
              <td>{inst.owner_email ?? ""}</td>
              <td>{inst.phone ?? ""}</td>
              <td>{inst.students ?? 0}</td>
              <td>
                <span className={`status-badge status-${inst.status}`}>
                  {inst.status}
                </span>
              </td>
              <td>
                {inst.status !== "approved" && <button className="link" onClick={() => submitApproval(inst.id, "approved")}>Approve</button>}
                {inst.status === "approved" && <button className="link" onClick={() => confirm(`Suspend ${inst.name}?`) && submitApproval(inst.id, "suspended")}>Suspend</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

function submitApproval(id: string, status: string) {
  // This would need proper API integration
  console.log(`Approving ${id} as ${status}`);
}