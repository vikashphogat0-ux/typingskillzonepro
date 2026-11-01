"use client";
import { useEffect, useMemo, useState } from "react";

type Drill={id:string;title:string;focus:string;instruction:string;text:string;source:"personal"|"starter"};
type Payload={drills:Drill[];personalised:boolean;attemptsAnalysed:number;weakKeys:string[];weakPairs:string[];error?:string};
const normal=(s:string)=>s.normalize("NFC");
function metrics(reference:string,typed:string,seconds:number){
 const a=Array.from(normal(reference)),b=Array.from(normal(typed));
 let correct=0;for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]===b[i])correct++;
 const accuracy=b.length?Math.round(correct/b.length*1000)/10:100;
 const wpm=seconds>0?Math.round((b.length/5)/(seconds/60)*10)/10:0;
 return {accuracy,wpm,typed:b.length,correct};
}
export default function TargetedDrillsPage(){
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState("");
 const [selected,setSelected]=useState(""),[typed,setTyped]=useState(""),[started,setStarted]=useState<number|null>(null),[elapsed,setElapsed]=useState(0),[lang,setLang]=useState<"en"|"hi">("en"),[level,setLevel]=useState<1|2|3>(1),[lastOutcome,setLastOutcome]=useState("");
 useEffect(()=>{setData(null);setTyped("");setElapsed(0);setStarted(null);fetch("/api/coach/drills?lang="+lang).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load drills.");setData(d);setSelected(d.drills?.[0]?.id??"");}).catch(e=>setError(e.message));},[lang]);
 useEffect(()=>{if(started===null)return;const id=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),250);return()=>window.clearInterval(id);},[started]);
 const drill=data?.drills.find(d=>d.id===selected)??data?.drills[0];
 const reference=useMemo(()=>drill?Array.from({length:level},()=>drill.text).join("\n\n"):"",[drill,level]);
 const score=useMemo(()=>drill?metrics(reference,typed,elapsed):{accuracy:100,wpm:0,typed:0,correct:0},[drill,reference,typed,elapsed]);
 const completed=!!reference&&Array.from(normal(typed)).length>=Array.from(normal(reference)).length;
 const reset=()=>{setTyped("");setElapsed(0);setStarted(null);};
 const finishRound=()=>{if(!completed)return;let next:1|2|3=level;let message="Repeat this level to stabilise your performance.";if(score.accuracy>=97&&score.wpm>=30){next=Math.min(3,level+1) as 1|2|3;message=next>level?"Accuracy and pace target met. Difficulty increased.":"Highest level maintained. Aim for even cleaner typing.";}else if(score.accuracy<90){next=Math.max(1,level-1) as 1|2|3;message=next<level?"Difficulty reduced to rebuild accuracy.":"Stay at Foundation until accuracy improves.";}setLevel(next);setLastOutcome(message);reset();};
 const change=(value:string)=>{if(started===null&&value.length)setStarted(Date.now());setTyped(value);};
 if(error)return <main className="page drills-page"><h1>Targeted Typing Drills</h1><p>{error}</p><a href="/login">Sign in</a></main>;
 if(!data||!drill)return <main className="page drills-page"><p>Building your personalised drills…</p></main>;
 return <main className="page drills-page">
  <header className="drills-hero"><p className="hint">TYPINGSKILLZONE · FOCUSED PRACTICE</p><h1>Targeted Typing Drills</h1><p>Exercises are generated from your recent recorded typing patterns. Practice results stay separate from official exam attempts.</p></header>
  <section className="tiles drills-metrics"><div><b>{data.attemptsAnalysed}</b><span>Attempts analysed</span></div><div><b>{data.weakKeys.length}</b><span>Weak keys detected</span></div><div><b>{data.weakPairs.length}</b><span>Weak pairs detected</span></div><div><b>{score.wpm}</b><span>Live practice WPM</span></div></section>
  <section className="admin-generation-panel drills-workspace">
   <div className="form"><label>Choose an exercise<select value={selected} onChange={e=>{setSelected(e.target.value);reset();}}>{data.drills.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label><label>Starter language (used when no personal drill exists)<select value={lang} onChange={e=>setLang(e.target.value as "en"|"hi")}><option value="en">English</option><option value="hi">Hindi</option></select></label></div>
   <h2>{drill.title}</h2><p>{drill.instruction}</p><p><b>Adaptive level: {level===1?"Foundation":level===2?"Progress":"Endurance"}</b> · {level} round{level>1?"s":""} of the exercise</p><p className="hint">{drill.source==="personal"?"Built from your saved passages and recent error patterns.":"Starter exercise — complete more tests to unlock personal drills."}</p>
   <pre className="drills-passage" lang={/[\u0900-\u097F]/.test(drill.text)?"hi":"en"} style={{whiteSpace:"pre-wrap",padding:"1rem",border:"1px solid var(--border, #888)",borderRadius:"12px",lineHeight:1.8}}>{reference}</pre>
   <label htmlFor="targeted-drill-input">Type the exercise here</label>
   <textarea className="drills-input" id="targeted-drill-input" rows={7} value={typed} onChange={e=>change(e.target.value)} placeholder="Start typing the exercise above…" spellCheck={false} lang={/[\u0900-\u097F]/.test(drill.text)?"hi":"en"} style={{width:"100%",fontSize:"1.05rem",lineHeight:1.7}} />
   <div className="tiles"><div><b>{score.wpm}</b><span>Gross practice WPM</span></div><div><b>{score.accuracy}%</b><span>Character accuracy</span></div><div><b>{elapsed}s</b><span>Elapsed time</span></div><div><b>{score.typed}/{Array.from(normal(reference)).length}</b><span>Characters typed</span></div></div>\n   {completed&&<p role="status"><b>Round complete.</b> Accuracy: {score.accuracy}% · Gross WPM: {score.wpm}</p>}\n   {lastOutcome&&<p role="status" className="hint">{lastOutcome}</p>}
   <div className="drills-actions"><button className="go" onClick={reset}>Restart exercise</button><button className="go" disabled={!completed} onClick={finishRound}>Finish round & adapt next</button><button className="go alt" onClick={()=>{navigator.clipboard?.writeText(reference).catch(()=>{});}}>Copy exercise</button><a className="go alt" href="/coach">Back to coach</a></div>
   <p className="hint">This is a focused practice metric, not an exam score. It does not apply any simulator-specific error penalty, pass mark, duration or keyboard restriction.</p>
  </section>
 </main>;
}
