"use client";
import { useEffect, useState } from "react";
import { api, del, fmtDate } from "@/lib/clientApi";

export default function SavedPassages() {
  const [passages, setPassages] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");

  const load = () => api("/api/saved").then((r) => setPassages(r.ok ? r.data : []));
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const r = await del(`/api/saved?passageId=${id}`);
    setMsg(r.ok ? "Removed from saved." : r.data.error ?? "Failed.");
    if (r.ok) load();
  };

  if (!passages) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <h1>Saved passages</h1>
      {msg && <p className="flash-msg" role="status">{msg}</p>}
      {!passages.length ? (
        <p>No saved passages yet. Browse the <a href="/library">passage library</a> and save any passage to practice it later.</p>
      ) : (
        <div className="plist">
          {passages.map((p) => (
            <div key={p.id} className="pitem">
              <div>
                <b>{p.title}</b>
                <span className="tag">{p.language === "hi" ? "Hindi" : "English"}</span>
                {p.exam && <span className="tag">{p.exam}</span>}
                <span className="hint"> {p.word_count} words · saved {fmtDate(p.saved_at)}</span>
              </div>
              <p className="hint">{p.preview}…</p>
              <p>
                <a href="/test" className="go" style={{ fontSize: 14, padding: "6px 14px" }}>Practice</a>
                {" "}<button className="link" onClick={() => remove(p.id)}>Remove</button>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
