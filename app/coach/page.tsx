"use client";
import { useEffect, useState } from "react";

type Data = { error?: string; role?: string; attempts?: {netWpm:number;accuracy:number;createdAt:string;simulator:string|null}[]; summary?: {tests:number;avgNetWpm:number;avgAccuracy:number;bestNetWpm:number}; patterns?: {weakKeys:{label:string;attempts:number;errors:number;errorRate:number}[];weakPairs:{label:string;attempts:number;errors:number;errorRate:number}[]}; recommendations?: string[] };

export default function CoachPage() {
  const [data,setData]=useState<Data|null>(null); const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/coach/insights").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load coaching insights.");setData(d);}).catch(e=>setError(e.message));},[]);
  if(error)return <main className="page"><h1>Intelligent Typing Coach</h1><p><a className="go" href="/coach/drills">Start targeted typing drills →</a></p><p>{error} <a href="/login">Sign in</a></p></main>;
  if(!data)return <main className="page"><p>Analysing your recent typing history…</p></main>;
  const s=data.summary;
  const trend=[...(data.attempts??[])].slice(0,10).reverse();
  const maxWpm=Math.max(1,...trend.map(x=>x.netWpm));
  const firstHalf=trend.slice(0,Math.ceil(trend.length/2));
  const secondHalf=trend.slice(Math.ceil(trend.length/2));
  const mean=(items:typeof trend,key:"netWpm"|"accuracy")=>items.length?Math.round(items.reduce((sum,x)=>sum+x[key],0)/items.length*10)/10:0;
  const speedChange=firstHalf.length&&secondHalf.length?Math.round((mean(secondHalf,"netWpm")-mean(firstHalf,"netWpm"))*10)/10:null;
  const accuracyChange=firstHalf.length&&secondHalf.length?Math.round((mean(secondHalf,"accuracy")-mean(firstHalf,"accuracy"))*10)/10:null;
  return <main className="page">
    <header><p className="hint">TYPINGSKILLZONE · PERSONAL PERFORMANCE</p><h1>Intelligent Typing Coach</h1><p>Evidence-based coaching from your saved attempts. Your exam settings and scoring rules are not modified.</p><p><a className="go" href="/coach/drills">Start targeted typing drills →</a></p></header>
    <section className="tiles">
      <div><b>{s?.tests??0}</b><span>Recent attempts</span></div><div><b>{s?.avgNetWpm??0}</b><span>Average net WPM</span></div><div><b>{s?.avgAccuracy??0}%</b><span>Average accuracy</span></div><div><b>{s?.bestNetWpm??0}</b><span>Best net WPM</span></div>
    </section>
    <section className="admin-generation-panel"><h2>Performance trend · last {trend.length} attempts</h2>{trend.length?<><div className="tiles"><div><b>{speedChange===null?"—":(speedChange>0?"+":"")+speedChange}</b><span>Net WPM change · first half to second half</span></div><div><b>{accuracyChange===null?"—":(accuracyChange>0?"+":"")+accuracyChange+"%"}</b><span>Accuracy change · first half to second half</span></div></div><div style={{display:"grid",gap:".8rem",marginTop:"1rem"}}>{trend.map((x,i)=><div key={x.createdAt+"-"+i} style={{display:"grid",gridTemplateColumns:"minmax(76px,auto) 1fr auto",alignItems:"center",gap:".75rem"}}><span className="hint">{new Date(x.createdAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div style={{height:"14px",borderRadius:"999px",background:"var(--border, #ddd)",overflow:"hidden"}}><div title={x.netWpm+" net WPM"} style={{height:"100%",width:Math.max(2,x.netWpm/maxWpm*100)+"%",background:"var(--accent, #2563eb)",borderRadius:"999px"}} /></div><b>{x.netWpm} WPM · {x.accuracy}%</b></div>)}</div><p className="hint">Bars show net WPM. The comparison uses the earlier and later halves of the displayed attempts; it is not an exam pass/fail judgement.</p></>:<p className="hint">Complete saved simulator attempts to build your performance trend.</p>}</section>
    <section className="admin-generation-panel"><h2>Your next actions</h2><ol>{(data.recommendations??[]).map((x,i)=><li key={i}>{x}</li>)}</ol><a className="go" href="/simulators">Start a focused practice session</a></section>
    <section className="admin-generation-panel"><h2>Weak keys</h2>{data.patterns?.weakKeys.length?<div className="tbl"><table><thead><tr><th>Key</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakKeys.map(x=><tr key={x.label}><td><b>{x.label}</b></td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">More recorded key-level attempts are needed to identify weak keys.</p>}</section>
    <section className="admin-generation-panel"><h2>Weak letter pairs</h2>{data.patterns?.weakPairs.length?<div className="tbl"><table><thead><tr><th>Pair</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakPairs.map(x=><tr key={x.label}><td><b>{x.label}</b></td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">No recurring weak pair detected yet.</p>}</section>
    <section className="admin-generation-panel"><h2>Recent progress</h2>{data.attempts?.length?<div className="tbl"><table><thead><tr><th>Date</th><th>Simulator</th><th>Net WPM</th><th>Accuracy</th></tr></thead><tbody>{data.attempts.map((x,i)=><tr key={i}><td>{new Date(x.createdAt).toLocaleDateString()}</td><td>{x.simulator??"Practice"}</td><td>{x.netWpm}</td><td>{x.accuracy}%</td></tr>)}</tbody></table></div>:<p>No saved attempts yet. Start with a simulator test.</p>}</section>
  </main>;
}
