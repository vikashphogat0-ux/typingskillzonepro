"use client";
import { useEffect, useState } from "react";

type Report = {error?:string;role?:string;periodDays?:number;totals?:Record<string,number|string>;interventions?:{active_learners:number;accuracy_support:number;speed_support:number;low_engagement:number;inactive_14_days:number};simulators?:{slug:string;name:string;attempts:number;avg_net_wpm:number;avg_accuracy:number}[];patterns?:{weakKeys:{label:string;attempts:number;errors:number;errorRate:number}[];weakPairs:{label:string;attempts:number;errors:number;errorRate:number}[]};sampleAttempts?:number};
export default function IntelligenceAdminPage(){
 const [data,setData]=useState<Report|null>(null);const [error,setError]=useState("");
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
 <section className="admin-generation-panel"><h2>Simulator performance</h2><div className="tbl"><table><thead><tr><th>Simulator</th><th>Attempts</th><th>Avg net WPM</th><th>Avg accuracy</th></tr></thead><tbody>{(data.simulators??[]).map(x=><tr key={x.slug}><td>{x.name}</td><td>{x.attempts}</td><td>{x.avg_net_wpm}</td><td>{x.avg_accuracy}%</td></tr>)}</tbody></table></div></section>
 <section className="admin-generation-panel"><h2>Platform-wide weak keys</h2>{data.patterns?.weakKeys.length?<div className="tbl"><table><thead><tr><th>Key</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakKeys.map(x=><tr key={x.label}><td>{x.label}</td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">Insufficient key-log data in this period.</p>}</section>
 <section className="admin-generation-panel"><h2>Platform-wide weak pairs</h2>{data.patterns?.weakPairs.length?<div className="tbl"><table><thead><tr><th>Pair</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakPairs.map(x=><tr key={x.label}><td>{x.label}</td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">Insufficient key-log data in this period.</p>}</section>
 <p className="hint">Key-level analysis processed up to {data.sampleAttempts??0} recent key-log records. Aggregate metrics cover all matching results.</p></main>;
}
