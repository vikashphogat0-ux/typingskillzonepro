"use client";
import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/clientApi";

interface P { id: string; title: string; word_count: number; language?: string; body?: string; date?: string; preview?: string; exam?: string | null }

export default function Library() {
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<"today" | "archive" | "all">("today");
  const [q, setQ] = useState(""); const [lang, setLang] = useState("");
  const [list, setList] = useState<P[]>([]);
  const [open, setOpen] = useState<P | null>(null);
  const [printing, setPrinting] = useState<P | null>(null);

  useEffect(() => { api("/api/library").then((r) => r.ok && setD(r.data)); }, []);
  useEffect(() => { const t = setTimeout(() => api(`/api/library?q=${encodeURIComponent(q)}${lang ? `&lang=${lang}` : ""}`).then((r) => r.ok && setList(r.data.list)), 250); return () => clearTimeout(t); }, [q, lang]);
  useEffect(() => { if (printing?.body) { const t = setTimeout(() => window.print(), 100); const done = () => setPrinting(null); window.addEventListener("afterprint", done, { once: true }); return () => { clearTimeout(t); window.removeEventListener("afterprint", done); }; } }, [printing]);

  const view = async (p: P) => { if (open?.id === p.id) return setOpen(null); const r = await api(`/api/library?id=${p.id}`); if (r.ok) setOpen(r.data); };
  const print = async (p: P) => { const full = p.body ? p : (await api(`/api/library?id=${p.id}`)).data; setPrinting(full); };

  const Card = ({ lg, p }: { lg: string; p: P }) => (
    <section className="card-p">
      <h3>{lg === "hi" ? "हिन्दी" : "English"}: {p.title}</h3>
      <p className="hint">{p.word_count} words · {fmtDate(p.date)}</p>
      <div className={`passage-box${lg === "hi" ? " hi" : ""}`} lang={lg}>{p.body}</div>
      <p><a className="go" href={`/api/library/download?date=${p.date}&lang=${lg}`}>Download .txt</a>{" "}<button className="go alt" onClick={() => print(p)}>Print</button></p>
    </section>
  );

  return (
    <div className="page">
      <h1>Passage library</h1>
      <div className="tabs" role="tablist">
        {(["today", "archive", "all"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "today" ? "Today’s passage" : t === "archive" ? "Last 14 days" : "All passages"}</button>)}
      </div>

      {tab === "today" && (!d ? <p>Loading…</p> : !d.daily.en && !d.daily.hi ? <p>No passages yet. Check back soon.</p> : (<>
        <p className="hint">A new passage each day in English and Hindi, the same for every student. Practise it before you take a simulator. <a href="/api/library/download?pack=today">Download both as one file</a></p>
        <div className="two">{d.daily.en && <Card lg="en" p={d.daily.en} />}{d.daily.hi && <Card lg="hi" p={d.daily.hi} />}</div></>))}

      {tab === "archive" && d && ["en", "hi"].map((l) => (
        <div key={l}><h2>{l === "hi" ? "हिन्दी" : "English"}</h2>
          <div className="tbl"><table><thead><tr><th>Date</th><th>Passage</th><th>Words</th><th></th></tr></thead><tbody>
            {d.archive[l].map((x: P) => <tr key={x.date}><td>{fmtDate(x.date)}</td><td>{x.title}</td><td>{x.word_count}</td><td><a href={`/api/library/download?date=${x.date}&lang=${l}`}>Download</a></td></tr>)}
            {!d.archive[l].length && <tr><td colSpan={4}>No passages yet.</td></tr>}</tbody></table></div></div>))}

      {tab === "all" && (<>
        <div className="form row"><label>Search<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title" /></label>
          <label>Language<select value={lang} onChange={(e) => setLang(e.target.value)}><option value="">Both</option><option value="en">English</option><option value="hi">Hindi</option></select></label></div>
        <div className="plist">
          {list.map((p) => (
            <div key={p.id} className="pitem">
              <div><b>{p.title}</b> <span className="tag">{p.language === "hi" ? "Hindi" : "English"}</span>{p.exam && <span className="tag">{p.exam}</span>} <span className="hint">{p.word_count} words</span></div>
              {open?.id === p.id ? <div className={`passage-box${p.language === "hi" ? " hi" : ""}`} lang={p.language}>{open.body}</div> : <p className="hint">{p.preview}…</p>}
              <p><button className="link" onClick={() => view(p)}>{open?.id === p.id ? "Hide" : "View"}</button> · <a href={`/api/library/download?id=${p.id}`}>Download</a> · <button className="link" onClick={() => print(p)}>Print</button></p>
            </div>))}
          {!list.length && <p>No passages match.</p>}
        </div></>)}

      {printing && <div className="print-area"><h1>{printing.title}</h1><p className={printing.language === "hi" || /[\u0900-\u097F]/.test(printing.body ?? "") ? "hi" : ""}>{printing.body}</p></div>}
    </div>
  );
}
