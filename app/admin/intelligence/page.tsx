"use client";
import { useEffect, useState } from "react";

type Report = {error?:string;role?:string;periodDays?:number;totals?:Record<string,number|string>;interventions?:{active_learners:number;accuracy_support:number;speed_support:number;low_engagement:number;inactive_14_days:number};learnerQueue?:{learner_ref:string;attempts:number;avg_net_wpm:number;avg_accuracy:number;last_attempt:string;flags:string[];suggested_action:string}[];simulators?:{slug:string;name:string;attempts:number;avg_net_wpm:number;avg_accuracy:number}[];patterns?:{weakKeys:{label:string;attempts:number;errors:number;errorRate:number}[];weakPairs:{label:string;attempts:number;errors:number;errorRate:number}[]};sampleAttempts?:number};
export default function IntelligenceAdminPage(){
 const [data,setData]=useState<Report|null>(null);const [error,setError]=useState("");const [queueFilter,setQueueFilter]=useState("all");const [queueSearch,setQueueSearch]=useState("");const [caseStatusFilter,setCaseStatusFilter]=useState("all");
 const [caseNotes,setCaseNotes]=useState<Record<string,{status:"new"|"contacted"|"resolved";note:string;updatedAt:string}>>({});
 const [caseReady,setCaseReady]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem("tsz-admin-support-cases-v1");if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object")setCaseNotes(parsed);}}catch{/* Start with an empty local support log. */}setCaseReady(true);},[]);
 useEffect(()=>{if(caseReady)try{localStorage.setItem("tsz-admin-support-cases-v1",JSON.stringify(caseNotes));}catch{/* Local case notes remain available for this visit. */}},[caseNotes,caseReady]);
 const updateCase=(ref:string,patch:Partial<{status:"new"|"contacted"|"resolved";note:string}>)=>setCaseNotes(old=>({...old,[ref]:{status:old[ref]?.status??"new",note:old[ref]?.note??"",updatedAt:new Date().toISOString(),...patch}}));
 const exportCases=()=>{
  const headers=["learner_ref","case_status","admin_note","updated_at"];
  const rows=Object.entries(caseNotes).map(([ref,item])=>[ref,item.status,item.note,item.updatedAt]);
  const quote=(value:string)=>"\""+String(value??"").replace(/"/g,'""')+"\"";
  const csv=[headers,...rows].map(row=>row.map(value=>quote(String(value))).join(",")).join("\\r\\n");
  const blob=new Blob(["\\uFEFF",csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="typingskillzone-support-cases.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };


 useEffect(()=>{fetch("/api/coach/insights?scope=platform").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load platform insights.");setData(d);}).catch(e=>setError(e.message));},[]);
 if(error)return <main className="page"><h1>Intelligence Centre</h1><p>{error}</p><a href="/admin">Back to admin</a></main>;
 if(!data)return <main className="page"><p>Preparing platform insights…</p></main>;
 const t=data.totals??{};
 return <main className="page admin"><nav><a href="/admin">Administration</a> · <a href="/admin/passage-studio">Passage Studio</a></nav><header className="admin-generation-panel"><p className="hint">TYPINGSKILLZONE · ADMIN INTELLIGENCE</p><h1>Intelligence Centre</h1><p>Aggregated, privacy-conscious learning and content insights for the last {data.periodDays} days. No student names, emails or individual records are exposed here.</p></header>
 <section className="tiles"><div><b>{t.attempts??0}</b><span>Attempts</span></div><div><b>{t.learners??0}</b><span>Active learners</span></div><div><b>{t.avg_net_wpm??0}</b><span>Average net WPM</span></div><div><b>{t.avg_accuracy??0}%</b><span>Average accuracy</span></div><div><b>{t.passed??0}</b><span>Passed by saved profile</span></div><div><b>{t.not_passed??0}</b><span>Not passed by saved profile</span></div></section>
 <section className="admin-generation-panel"><h2>Student progress · intervention indicators</h2>
 <p className="hint">Aggregated counts for learners with saved attempts in the last 30 days. These are coaching signals, not diagnoses or disciplinary labels. No student identities or individual records are shown.</p>
 <div className="tiles">
 <div><b>{data.interventions?.active_learners??t.learners??0}</b><span>Active learners</span></div>
 <div><b>{data.interventions?.accuracy_support??0}</b><span>Average accuracy below 90%</span></div>
 <div><b>{data.interventions?.speed_support??0}</b><span>Average net WPM below 25</span></div>
 <div><b>{data.interventions?.low_engagement??0}</b><span>One or fewer attempts</span></div>
 <div><b>{data.interventions?.inactive_14_days??0}</b><span>No attempt in 14+ days</span></div>
 </div>
 <p className="hint">Thresholds are configurable coaching heuristics, not official exam pass criteria. Learners can appear in more than one category.</p></section>
 <section className="admin-generation-panel"><h2>Learner support queue</h2>
 <p className="hint">Prioritised coaching follow-ups from the last 30 days. Learners are represented by pseudonymous references. No names, email addresses or contact details are exposed.</p>
 <div className="form">
 <label>Filter by support need<select value={queueFilter} onChange={e=>setQueueFilter(e.target.value)}><option value="all">All flagged learners</option><option value="accuracy">Accuracy support</option><option value="speed">Speed support</option><option value="engagement">Low engagement</option><option value="inactive">Inactive 14+ days</option></select></label>
 <label>Find learner reference<input value={queueSearch} onChange={e=>setQueueSearch(e.target.value)} placeholder="Search pseudonymous reference" /></label>
 <label>Filter by case status<select value={caseStatusFilter} onChange={e=>setCaseStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Follow-up recorded</option><option value="resolved">Resolved</option></select></label>
 </div>
 {(()=>{const items=(data.learnerQueue??[]).filter(x=>(queueFilter==="all"||x.flags.includes(queueFilter))&&x.learner_ref.toLowerCase().includes(queueSearch.trim().toLowerCase())&&(caseStatusFilter==="all"||(caseNotes[x.learner_ref]?.status??"new")===caseStatusFilter));const all= data.learnerQueue??[];const caseCounts={new:all.filter(x=>(caseNotes[x.learner_ref]?.status??"new")==="new").length,contacted:all.filter(x=>caseNotes[x.learner_ref]?.status==="contacted").length,resolved:all.filter(x=>caseNotes[x.learner_ref]?.status==="resolved").length};return <><div className="tiles"><div><b>{caseCounts.new}</b><span>New cases</span></div><div><b>{caseCounts.contacted}</b><span>Follow-ups recorded</span></div><div><b>{caseCounts.resolved}</b><span>Resolved cases</span></div><div><b>{Object.keys(caseNotes).length}</b><span>Saved local case records</span></div></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".75rem",flexWrap:"wrap",margin:"1rem 0"}}><p className="hint">{items.length} matching flagged learners · maximum 100 returned</p><button type="button" className="go alt" onClick={exportCases}>Export local case history (CSV)</button></div>{items.length?<div className="tbl"><table><thead><tr><th>Learner ref</th><th>Support flags</th><th>Attempts</th><th>Avg net WPM</th><th>Avg accuracy</th><th>Last attempt</th><th>Suggested action</th><th>Case status</th></tr></thead><tbody>{items.map(x=>{const entry=caseNotes[x.learner_ref]??{status:"new" as const,note:"",updatedAt:""};return <tr key={x.learner_ref}><td><b>{x.learner_ref}</b></td><td>{x.flags.join(", ")}</td><td>{x.attempts}</td><td>{x.avg_net_wpm}</td><td>{x.avg_accuracy}%</td><td>{new Date(x.last_attempt).toLocaleDateString()}</td><td>{x.suggested_action}</td><td><div style={{display:"grid",gap:".4rem",minWidth:"170px"}}><select aria-label={"Case status for "+x.learner_ref} value={entry.status} onChange={e=>updateCase(x.learner_ref,{status:e.target.value as "new"|"contacted"|"resolved"})}><option value="new">New</option><option value="contacted">Follow-up recorded</option><option value="resolved">Resolved</option></select><textarea aria-label={"Internal note for "+x.learner_ref} rows={2} maxLength={500} placeholder="Private admin note (max 500 chars)" value={entry.note} onChange={e=>updateCase(x.learner_ref,{note:e.target.value})}/><span className="hint">{entry.updatedAt?"Updated "+new Date(entry.updatedAt).toLocaleString():"No action recorded"}</span></div></td></tr>})}</tbody></table></div>:<p className="hint">No learners match this filter.</p>}</>;})()}
 <p className="hint">Case status and notes are stored only in this browser's local storage. They are not shared with other admins, synced to the server, or attached to student accounts. Do not enter sensitive personal information. Queue entries are limited to 100 learners.</p>
 </section>
 <section className="admin-generation-panel"><h2>Simulator performance</h2><div className="tbl"><table><thead><tr><th>Simulator</th><th>Attempts</th><th>Avg net WPM</th><th>Avg accuracy</th></tr></thead><tbody>{(data.simulators??[]).map(x=><tr key={x.slug}><td>{x.name}</td><td>{x.attempts}</td><td>{x.avg_net_wpm}</td><td>{x.avg_accuracy}%</td></tr>)}</tbody></table></div></section>
 <section className="admin-generation-panel"><h2>Platform-wide weak keys</h2>{data.patterns?.weakKeys.length?<div className="tbl"><table><thead><tr><th>Key</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakKeys.map(x=><tr key={x.label}><td>{x.label}</td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">Insufficient key-log data in this period.</p>}</section>
 <section className="admin-generation-panel"><h2>Platform-wide weak pairs</h2>{data.patterns?.weakPairs.length?<div className="tbl"><table><thead><tr><th>Pair</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakPairs.map(x=><tr key={x.label}><td>{x.label}</td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">Insufficient key-log data in this period.</p>}</section>
 <p className="hint">Key-level analysis processed up to {data.sampleAttempts??0} recent key-log records. Aggregate metrics cover all matching results.</p></main>;
}
