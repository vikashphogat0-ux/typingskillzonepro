"use client";
import { useEffect, useState } from "react";

type Report = {error?:string;role?:string;periodDays?:number;totals?:Record<string,number|string>;interventions?:{active_learners:number;accuracy_support:number;speed_support:number;low_engagement:number;inactive_14_days:number};learnerQueue?:{learner_ref:string;attempts:number;avg_net_wpm:number;avg_accuracy:number;last_attempt:string;flags:string[];suggested_action:string}[];simulators?:{slug:string;name:string;attempts:number;avg_net_wpm:number;avg_accuracy:number}[];patterns?:{weakKeys:{label:string;attempts:number;errors:number;errorRate:number}[];weakPairs:{label:string;attempts:number;errors:number;errorRate:number}[]};sampleAttempts?:number};
export default function IntelligenceAdminPage(){
 const [data,setData]=useState<Report|null>(null);const [error,setError]=useState("");const [periodDays,setPeriodDays]=useState(30);const [refreshKey,setRefreshKey]=useState(0);const [queueFilter,setQueueFilter]=useState("all");const [queueSearch,setQueueSearch]=useState("");const [caseStatusFilter,setCaseStatusFilter]=useState("all");
 const [caseNotes,setCaseNotes]=useState<Record<string,{status:"new"|"contacted"|"resolved";note:string;updatedAt:string}>>({});
 const [caseReady,setCaseReady]=useState(false);
 const [scheduleDay,setScheduleDay]=useState("1");
 const [scheduleTime,setScheduleTime]=useState("09:00");
 const [scheduleEnabled,setScheduleEnabled]=useState(false);
 const [scheduleSaved,setScheduleSaved]=useState(false);
 const [scheduleReady,setScheduleReady]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem("tsz-admin-support-cases-v1");if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object")setCaseNotes(parsed);}}catch{/* Start with an empty local support log. */}setCaseReady(true);},[]);
 useEffect(()=>{if(caseReady)try{localStorage.setItem("tsz-admin-support-cases-v1",JSON.stringify(caseNotes));}catch{/* Local case notes remain available for this visit. */}},[caseNotes,caseReady]);
 useEffect(()=>{try{const raw=localStorage.getItem("tsz-admin-report-schedule-v1");if(raw){const saved=JSON.parse(raw);if(saved&&typeof saved==="object"){if(["1","5","10","15","20","25"].includes(String(saved.day)))setScheduleDay(String(saved.day));if(typeof saved.time==="string"&&/^([01]\\d|2[0-3]):[0-5]\\d$/.test(saved.time))setScheduleTime(saved.time);setScheduleEnabled(saved.enabled===true);}}}catch{/* Keep default schedule draft. */}setScheduleReady(true);},[]);
 const saveScheduleDraft=()=>{try{localStorage.setItem("tsz-admin-report-schedule-v1",JSON.stringify({day:scheduleDay,time:scheduleTime,enabled:scheduleEnabled,updatedAt:new Date().toISOString(),mode:"draft-only"}));setScheduleSaved(true);}catch{setScheduleSaved(false);}};
 const nextSchedulePreview=()=>{const now=new Date();const day=Number(scheduleDay);let next=new Date(now.getFullYear(),now.getMonth(),day,Number(scheduleTime.slice(0,2)),Number(scheduleTime.slice(3,5)));if(next<=now)next=new Date(now.getFullYear(),now.getMonth()+1,day,Number(scheduleTime.slice(0,2)),Number(scheduleTime.slice(3,5)));return next;};

 const updateCase=(ref:string,patch:Partial<{status:"new"|"contacted"|"resolved";note:string}>)=>setCaseNotes(old=>({...old,[ref]:{status:old[ref]?.status??"new",note:old[ref]?.note??"",updatedAt:new Date().toISOString(),...patch}}));
 const exportSupportQueue=()=>{
  const rows=[
   ["Learner reference","Support flags","Attempts","Average net WPM","Average accuracy (%)","Last attempt","Suggested action"],
   ...(data?.learnerQueue??[]).map(x=>[x.learner_ref,x.flags.join("; "),String(x.attempts),String(x.avg_net_wpm),String(x.avg_accuracy),x.last_attempt,x.suggested_action])
  ];
  const quote=(value:string)=>"\""+String(value??"").replace(/"/g,'""')+"\"";
  const csv=rows.map(row=>row.map(value=>quote(String(value??""))).join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="typingskillzone-pseudonymous-support-queue.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };
 const exportCases=()=>{
  const headers=["learner_ref","case_status","admin_note","updated_at"];
  const rows=Object.entries(caseNotes).map(([ref,item])=>[ref,item.status,item.note,item.updatedAt]);
  const quote=(value:string)=>"\""+String(value??"").replace(/"/g,'""')+"\"";
  const csv=[headers,...rows].map(row=>row.map(value=>quote(String(value))).join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="typingskillzone-support-cases.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };


 useEffect(()=>{let active=true;setError("");setData(null);fetch("/api/coach/insights?scope=platform&days="+periodDays).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load platform insights.");if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[periodDays,refreshKey]);
 if(error)return <main className="page"><h1>Intelligence Centre</h1><p>{error}</p><a href="/admin">Back to admin</a></main>;
 if(!data)return <main className="page"><p>Preparing platform insights…</p></main>;
 const t=data.totals??{};
 const exportPerformanceReport=()=>{
  const rows=[
   ["TypingSkillZone Admin Performance Report"],
   ["Reporting period (days)",String(data.periodDays??periodDays)],
   ["Generated at",new Date().toISOString()],
   [],
   ["Platform metric","Value"],
   ["Attempts",String(t.attempts??0)],
   ["Active learners",String(t.learners??0)],
   ["Average net WPM",String(t.avg_net_wpm??0)],
   ["Average accuracy (%)",String(t.avg_accuracy??0)],
   ["Passed by saved profile",String(t.passed??0)],
   ["Not passed by saved profile",String(t.not_passed??0)],
   [],
   ["Intervention indicator","Learners"],
   ["Accuracy support (<90%)",String(data.interventions?.accuracy_support??0)],
   ["Speed support (<25 net WPM)",String(data.interventions?.speed_support??0)],
   ["Low engagement (<=1 attempt)",String(data.interventions?.low_engagement??0)],
   ["Inactive (14+ days)",String(data.interventions?.inactive_14_days??0)],
   [],
   ["Simulator","Attempts","Average net WPM","Average accuracy (%)"],
   ...(data.simulators??[]).map(x=>[x.name,String(x.attempts),String(x.avg_net_wpm),String(x.avg_accuracy)]),
   [],
   ["Weak key","Errors","Attempts","Error rate (%)"],
   ...(data.patterns?.weakKeys??[]).map(x=>[x.label,String(x.errors),String(x.attempts),String(x.errorRate)]),
   [],
   ["Weak pair","Errors","Attempts","Error rate (%)"],
   ...(data.patterns?.weakPairs??[]).map(x=>[x.label,String(x.errors),String(x.attempts),String(x.errorRate)])
  ];
  const quote=(value:string)=>"\""+String(value??"").replace(/"/g,'""')+"\"";
  const csv=rows.map(row=>row.map(value=>quote(String(value??""))).join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="typingskillzone-admin-performance-"+(data.periodDays??periodDays)+"-days.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };

 return <main className="page admin"><nav><a href="/admin">Administration</a> · <a href="/admin/passage-studio">Passage Studio</a></nav><header className="admin-generation-panel"><p className="hint">TYPINGSKILLZONE · ADMIN INTELLIGENCE</p><h1>Intelligence Centre</h1><p>Aggregated, privacy-conscious learning and content insights for the selected reporting period. No student names, emails or individual records are exposed here.</p><div className="form report-controls"><label>Reporting period<select value={periodDays} onChange={e=>setPeriodDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label><button type="button" className="go alt" onClick={()=>setRefreshKey(x=>x+1)}>Refresh report</button><button type="button" className="go alt" onClick={exportPerformanceReport}>Export performance CSV</button><button type="button" className="go" onClick={()=>window.print()}>Print / Save PDF</button></div><p className="hint print-only">TypingSkillZone · Admin performance report · {data.periodDays}-day period · Generated {new Date().toLocaleString()}</p></header>
 <section className="tiles"><div><b>{t.attempts??0}</b><span>Attempts</span></div><div><b>{t.learners??0}</b><span>Active learners</span></div><div><b>{t.avg_net_wpm??0}</b><span>Average net WPM</span></div><div><b>{t.avg_accuracy??0}%</b><span>Average accuracy</span></div><div><b>{t.passed??0}</b><span>Passed by saved profile</span></div><div><b>{t.not_passed??0}</b><span>Not passed by saved profile</span></div></section>
 <section className="admin-generation-panel"><h2>Student progress · intervention indicators</h2>
 <p className="hint">Aggregated counts for learners with saved attempts in the last {data.periodDays} days. These are coaching signals, not diagnoses or disciplinary labels. No student identities or individual records are shown.</p>
 <div className="tiles">
 <div><b>{data.interventions?.active_learners??t.learners??0}</b><span>Active learners</span></div>
 <div><b>{data.interventions?.accuracy_support??0}</b><span>Average accuracy below 90%</span></div>
 <div><b>{data.interventions?.speed_support??0}</b><span>Average net WPM below 25</span></div>
 <div><b>{data.interventions?.low_engagement??0}</b><span>One or fewer attempts</span></div>
 <div><b>{data.interventions?.inactive_14_days??0}</b><span>No attempt in 14+ days</span></div>
 </div>
 <p className="hint">Thresholds are configurable coaching heuristics, not official exam pass criteria. Learners can appear in more than one category.</p></section>
 <section className="admin-generation-panel"><h2>Learner support queue</h2>
 <p className="hint">Prioritised coaching follow-ups from the last {data.periodDays} days. Learners are represented by pseudonymous references. No names, email addresses or contact details are exposed.</p>
 <div className="form">
 <label>Filter by support need<select value={queueFilter} onChange={e=>setQueueFilter(e.target.value)}><option value="all">All flagged learners</option><option value="accuracy">Accuracy support</option><option value="speed">Speed support</option><option value="engagement">Low engagement</option><option value="inactive">Inactive 14+ days</option></select></label>
 <label>Find learner reference<input value={queueSearch} onChange={e=>setQueueSearch(e.target.value)} placeholder="Search pseudonymous reference" /></label>
 <label>Filter by case status<select value={caseStatusFilter} onChange={e=>setCaseStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Follow-up recorded</option><option value="resolved">Resolved</option></select></label>
 </div>
 {(()=>{const items=(data.learnerQueue??[]).filter(x=>(queueFilter==="all"||x.flags.includes(queueFilter))&&x.learner_ref.toLowerCase().includes(queueSearch.trim().toLowerCase())&&(caseStatusFilter==="all"||(caseNotes[x.learner_ref]?.status??"new")===caseStatusFilter));const all= data.learnerQueue??[];const caseCounts={new:all.filter(x=>(caseNotes[x.learner_ref]?.status??"new")==="new").length,contacted:all.filter(x=>caseNotes[x.learner_ref]?.status==="contacted").length,resolved:all.filter(x=>caseNotes[x.learner_ref]?.status==="resolved").length};return <><div className="tiles"><div><b>{caseCounts.new}</b><span>New cases</span></div><div><b>{caseCounts.contacted}</b><span>Follow-ups recorded</span></div><div><b>{caseCounts.resolved}</b><span>Resolved cases</span></div><div><b>{Object.keys(caseNotes).length}</b><span>Saved local case records</span></div></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".75rem",flexWrap:"wrap",margin:"1rem 0"}}><p className="hint">{items.length} matching flagged learners · maximum 100 returned</p><button type="button" className="go alt" onClick={exportCases}>Export local case history (CSV)</button><button type="button" className="go alt" onClick={exportSupportQueue}>Export pseudonymous queue (CSV)</button></div>{items.length?<div className="tbl"><table><thead><tr><th>Learner ref</th><th>Support flags</th><th>Attempts</th><th>Avg net WPM</th><th>Avg accuracy</th><th>Last attempt</th><th>Suggested action</th><th>Case status</th></tr></thead><tbody>{items.map(x=>{const entry=caseNotes[x.learner_ref]??{status:"new" as const,note:"",updatedAt:""};return <tr key={x.learner_ref}><td><b>{x.learner_ref}</b></td><td>{x.flags.join(", ")}</td><td>{x.attempts}</td><td>{x.avg_net_wpm}</td><td>{x.avg_accuracy}%</td><td>{new Date(x.last_attempt).toLocaleDateString()}</td><td>{x.suggested_action}</td><td><div style={{display:"grid",gap:".4rem",minWidth:"170px"}}><select aria-label={"Case status for "+x.learner_ref} value={entry.status} onChange={e=>updateCase(x.learner_ref,{status:e.target.value as "new"|"contacted"|"resolved"})}><option value="new">New</option><option value="contacted">Follow-up recorded</option><option value="resolved">Resolved</option></select><textarea aria-label={"Internal note for "+x.learner_ref} rows={2} maxLength={500} placeholder="Private admin note (max 500 chars)" value={entry.note} onChange={e=>updateCase(x.learner_ref,{note:e.target.value})}/><span className="hint">{entry.updatedAt?"Updated "+new Date(entry.updatedAt).toLocaleString():"No action recorded"}</span></div></td></tr>})}</tbody></table></div>:<p className="hint">No learners match this filter.</p>}</>;})()}
 <p className="hint">Case status and notes are stored only in this browser's local storage. They are not shared with other admins, synced to the server, or attached to student accounts. Do not enter sensitive personal information. Queue entries are limited to 100 learners.</p>
 </section>
 <section className="admin-generation-panel"><h2>Monthly report schedule · draft</h2>
 <p className="hint">Configure a proposed monthly report time. This is a local preview only: it does not create a Cloudflare Cron Trigger, send email, call Resend, or run when this browser is closed. The draft is saved only in this browser.</p>
 <div className="form">
  <label>Run on day<select value={scheduleDay} onChange={e=>{setScheduleDay(e.target.value);setScheduleSaved(false);}}><option value="1">1st of each month</option><option value="5">5th of each month</option><option value="10">10th of each month</option><option value="15">15th of each month</option><option value="20">20th of each month</option><option value="25">25th of each month</option></select></label>
  <label>Local time<input type="time" value={scheduleTime} onChange={e=>{setScheduleTime(e.target.value);setScheduleSaved(false);}} /></label>
  <label>Draft status<select value={scheduleEnabled?"enabled":"disabled"} onChange={e=>{setScheduleEnabled(e.target.value==="enabled");setScheduleSaved(false);}}><option value="disabled">Not enabled</option><option value="enabled">Enabled (draft only)</option></select></label>
 </div>
 <p><b>Next proposed run:</b> {nextSchedulePreview().toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone||"local browser time"})</p>
 <div style={{display:"flex",gap:".75rem",alignItems:"center",flexWrap:"wrap"}}><button type="button" className="go alt" onClick={saveScheduleDraft}>Save schedule draft</button>{scheduleSaved&&<span className="hint">Draft saved in this browser.</span>}</div>
 <p className="hint">The “enabled” choice records your proposed preference only. Actual scheduled execution, recipient selection, delivery consent and email sending are not implemented. No email address or credential is collected here.</p>
 </section>
 <section className="admin-generation-panel"><h2>Simulator performance</h2><div className="tbl"><table><thead><tr><th>Simulator</th><th>Attempts</th><th>Avg net WPM</th><th>Avg accuracy</th></tr></thead><tbody>{(data.simulators??[]).map(x=><tr key={x.slug}><td>{x.name}</td><td>{x.attempts}</td><td>{x.avg_net_wpm}</td><td>{x.avg_accuracy}%</td></tr>)}</tbody></table></div></section>
 <section className="admin-generation-panel"><h2>Platform-wide weak keys</h2>{data.patterns?.weakKeys.length?<div className="tbl"><table><thead><tr><th>Key</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakKeys.map(x=><tr key={x.label}><td>{x.label}</td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">Insufficient key-log data in this period.</p>}</section>
 <section className="admin-generation-panel"><h2>Platform-wide weak pairs</h2>{data.patterns?.weakPairs.length?<div className="tbl"><table><thead><tr><th>Pair</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakPairs.map(x=><tr key={x.label}><td>{x.label}</td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">Insufficient key-log data in this period.</p>}</section>
 <p className="hint">Key-level analysis processed up to {data.sampleAttempts??0} recent key-log records. Aggregate metrics cover all matching results.</p><style jsx global>{`@media print{@page{size:A4 portrait;margin:14mm}body{background:#fff!important;color:#111!important}nav,.report-controls,button,select,input,textarea{display:none!important}.page{max-width:none!important;padding:0!important}.admin-generation-panel,.tiles,section{break-inside:avoid;box-shadow:none!important;background:#fff!important;color:#111!important;border-color:#bbb!important}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb!important;padding:6px!important;color:#111!important}.hint{color:#444!important}.print-only{display:block!important}}@media screen{.print-only{display:none!important}}`}</style></main>;
}
