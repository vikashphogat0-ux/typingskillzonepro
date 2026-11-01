"use client";
import { useEffect, useState } from "react";

type Data = { error?: string; role?: string; attempts?: {netWpm:number;accuracy:number;createdAt:string;simulator:string|null}[]; weeklyReport?: {recent:{attempts:number;avgNetWpm:number;bestNetWpm:number;avgAccuracy:number};previous:{attempts:number;avgNetWpm:number;avgAccuracy:number};changes:{avgNetWpm:number|null;avgAccuracy:number|null};coverage:{days:number;attemptsAnalysed:number;capped:boolean}}; summary?: {tests:number;avgNetWpm:number;avgAccuracy:number;bestNetWpm:number}; patterns?: {weakKeys:{label:string;attempts:number;errors:number;errorRate:number}[];weakPairs:{label:string;attempts:number;errors:number;errorRate:number}[]}; recommendations?: string[] };

type Goals={sessions:number;targetWpm:number;targetAccuracy:number};
type PlanItem={day:string;focus:string;task:string;duration:string;href:string};
const DEFAULT_GOALS:Goals={sessions:3,targetWpm:50,targetAccuracy:95};
const dayKey=(date:Date)=>date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
function streakDays(attempts:NonNullable<Data["attempts"]>){
  const days=new Set(attempts.map(x=>dayKey(new Date(x.createdAt))));
  const cursor=new Date();cursor.setHours(0,0,0,0);
  if(!days.has(dayKey(cursor)))cursor.setDate(cursor.getDate()-1);
  let count=0;
  while(days.has(dayKey(cursor))){count++;cursor.setDate(cursor.getDate()-1);}
  return count;
}
export default function CoachPage() {
  const [data,setData]=useState<Data|null>(null); const [error,setError]=useState("");
  const [goals,setGoals]=useState<Goals>(DEFAULT_GOALS);
  const [goalsReady,setGoalsReady]=useState(false);
  const [planChecks,setPlanChecks]=useState<Record<string,boolean>>({});
  const [planReady,setPlanReady]=useState(false);
  const [planWeek,setPlanWeek]=useState("");
  useEffect(()=>{try{const saved=localStorage.getItem("tsz-coach-daily-goals-v1");if(saved){const parsed=JSON.parse(saved) as Partial<Goals>;setGoals({sessions:Math.min(10,Math.max(1,Math.round(Number(parsed.sessions)||3))),targetWpm:Math.min(200,Math.max(1,Number(parsed.targetWpm)||50)),targetAccuracy:Math.min(100,Math.max(1,Number(parsed.targetAccuracy)||95))});}}catch{/* Keep safe defaults. */}setGoalsReady(true);},[]);
  useEffect(()=>{if(goalsReady)try{localStorage.setItem("tsz-coach-daily-goals-v1",JSON.stringify(goals));}catch{/* Goals remain available for this visit. */}},[goals,goalsReady]);
  useEffect(()=>{const now=new Date();const monday=new Date(now);monday.setHours(0,0,0,0);monday.setDate(now.getDate()-((now.getDay()+6)%7));const key=dayKey(monday);setPlanWeek(key);try{const saved=localStorage.getItem("tsz-coach-weekly-plan-"+key);if(saved)setPlanChecks(JSON.parse(saved) as Record<string,boolean>);}catch{/* Start with an unchecked plan if stored data is invalid. */}setPlanReady(true);},[]);
  useEffect(()=>{if(planReady&&planWeek)try{localStorage.setItem("tsz-coach-weekly-plan-"+planWeek,JSON.stringify(planChecks));}catch{/* Checklist remains usable for this visit. */}},[planChecks,planReady,planWeek]);
  useEffect(()=>{fetch("/api/coach/insights").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load coaching insights.");setData(d);}).catch(e=>setError(e.message));},[]);
  if(error)return <main className="page"><h1>Intelligent Typing Coach</h1><p><a className="go" href="/coach/drills">Start targeted typing drills →</a></p><p>{error} <a href="/login">Sign in</a></p></main>;
  if(!data)return <main className="page"><p>Analysing your recent typing history…</p></main>;
  const s=data.summary;
  const attempts=data.attempts??[];
  const today=dayKey(new Date());
  const todayAttempts=attempts.filter(x=>dayKey(new Date(x.createdAt))===today);
  const todayBestWpm=todayAttempts.length?Math.max(...todayAttempts.map(x=>x.netWpm)):0;
  const todayBestAccuracy=todayAttempts.length?Math.max(...todayAttempts.map(x=>x.accuracy)):0;
  const sessionsProgress=Math.min(100,Math.round(todayAttempts.length/goals.sessions*100));
  const wpmProgress=Math.min(100,Math.round(todayBestWpm/goals.targetWpm*100));
  const accuracyProgress=Math.min(100,Math.round(todayBestAccuracy/goals.targetAccuracy*100));
  const streak=streakDays(attempts);
  const weakKey=data.patterns?.weakKeys[0]?.label;
  const weakPair=data.patterns?.weakPairs[0]?.label;
  const needsAccuracy=(s?.avgAccuracy??100)<95;
  const needsSpeed=(s?.avgNetWpm??0)<goals.targetWpm;
  const todayDate=new Date();
  const mondayOffset=(todayDate.getDay()+6)%7;
  const plannerDays=Array.from({length:7},(_,i)=>{const d=new Date(todayDate);d.setHours(0,0,0,0);d.setDate(d.getDate()-mondayOffset+i);return d;});
  const weeklyPlan:PlanItem[]=plannerDays.map((date,i)=>{
    const focus=needsAccuracy?"Accuracy & control":weakKey?"Weak-key training":weakPair?"Letter transitions":needsSpeed?"Speed & rhythm":"Endurance & consistency";
    const tasks=[
      {focus,task:weakKey?"Start with the key "+weakKey+" in targeted drills, then complete one short simulator session.":"Complete a short controlled warm-up, then one simulator session.",duration:"20 minutes",href:"/coach/drills"},
      {focus:weakPair?"Letter pair "+weakPair+" and smooth transitions":"Accuracy-first passage practice",task:weakPair?"Practise words containing "+weakPair+" and avoid rushing the transition.":"Complete one passage slowly, prioritising correct characters.",duration:"15 minutes",href:"/coach/drills"},
      {focus:"Baseline check",task:"Complete one normal simulator attempt and review net WPM and accuracy.",duration:"20 minutes",href:"/simulators"},
      {focus:"Targeted correction",task:weakKey?"Repeat the weak-key exercise for "+weakKey+"; stop if accuracy falls.":"Repeat the exercise with the highest observed error rate.",duration:"15 minutes",href:"/coach/drills"},
      {focus:"Speed with control",task:"Use a familiar passage and increase pace only while maintaining your accuracy target.",duration:"20 minutes",href:"/simulators"},
      {focus:"Full-length practice",task:"Complete one simulator session using its normal exam rules and review the result.",duration:"30 minutes",href:"/simulators"},
      {focus:"Weekly review",task:"Review your weekly report, weak patterns and next week's goals. Keep this day light.",duration:"10 minutes",href:"/coach"}
    ][i];
    return {day:date.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}),...tasks};
  });
  const completedPlan=weeklyPlan.filter((_,i)=>planChecks[planWeek+"-"+i]).length;
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
    <section className="admin-generation-panel">
      <h2>Weekly performance report</h2>
      {data.weeklyReport?<>
        <p className="hint">Rolling 7-day comparison against the preceding 7 days. Only saved simulator attempts are included.</p>
        <div className="tiles">
          <div><b>{data.weeklyReport.recent.attempts}</b><span>Attempts · last 7 days</span></div>
          <div><b>{data.weeklyReport.recent.avgNetWpm}</b><span>Average net WPM</span></div>
          <div><b>{data.weeklyReport.recent.bestNetWpm}</b><span>Best net WPM</span></div>
          <div><b>{data.weeklyReport.recent.avgAccuracy}%</b><span>Average accuracy</span></div>
        </div>
        <h3 style={{marginTop:"1rem"}}>Compared with previous week</h3>
        <div className="tiles">
          <div><b>{data.weeklyReport.changes.avgNetWpm===null?"Not enough data":(data.weeklyReport.changes.avgNetWpm>0?"+":"")+data.weeklyReport.changes.avgNetWpm}</b><span>Average net WPM change</span></div>
          <div><b>{data.weeklyReport.changes.avgAccuracy===null?"Not enough data":(data.weeklyReport.changes.avgAccuracy>0?"+":"")+data.weeklyReport.changes.avgAccuracy+"%"}</b><span>Average accuracy change</span></div>
          <div><b>{data.weeklyReport.previous.attempts}</b><span>Attempts · previous 7 days</span></div>
          <div><b>{data.weeklyReport.coverage.attemptsAnalysed}</b><span>Attempts analysed · 14 days</span></div>
        </div>
        {data.weeklyReport.coverage.capped&&<p className="hint">The report reached its 500-attempt analysis limit. Older attempts within this period may not be included.</p>}
        {!data.weeklyReport.previous.attempts&&<p className="hint">Complete tests in both periods to see a meaningful week-over-week comparison.</p>}
        {data.weeklyReport.recent.attempts===0&&<p className="hint">No saved simulator attempts were found in the last 7 days.</p>}
      </>:<p className="hint">Weekly report is not available yet. Refresh after your next saved test.</p>}
    </section>
    <section className="admin-generation-panel">
      <h2>Your 7-day training planner</h2>
      <p className="hint">Generated from your recent speed, accuracy and weak-key patterns. This is a practice schedule only; simulator exam settings remain unchanged. Check off each session as you complete it.</p>
      <div className="tiles"><div><b>{completedPlan}/7</b><span>Days completed</span></div><div><b>{needsAccuracy?"Accuracy":weakKey?"Weak key":weakPair?"Letter pair":needsSpeed?"Speed":"Consistency"}</b><span>Primary training priority</span></div><div><b>{goals.sessions}</b><span>Daily session goal</span></div><div><b>{goals.targetAccuracy}%</b><span>Accuracy target</span></div></div>
      <div style={{display:"grid",gap:".75rem",marginTop:"1rem"}}>
        {weeklyPlan.map((item,i)=><article key={planWeek+"-"+i} style={{border:"1px solid var(--border, #888)",borderRadius:"12px",padding:"1rem",opacity:planChecks[planWeek+"-"+i]?.65:1}}>
          <label style={{display:"flex",alignItems:"flex-start",gap:".75rem",cursor:"pointer"}}>
            <input type="checkbox" checked={!!planChecks[planWeek+"-"+i]} onChange={e=>setPlanChecks(old=>({...old,[planWeek+"-"+i]:e.target.checked}))} />
            <span style={{flex:1}}><b>{item.day} · {item.focus}</b><br/><span>{item.task}</span><br/><span className="hint">Suggested time: {item.duration}</span><br/><a className="go alt" href={item.href}>Open practice</a></span>
          </label>
        </article>)}
      </div>
      <p className="hint">Checklist progress is saved in this browser for the current Monday–Sunday week. The planner does not create or submit official exam attempts.</p>
    </section>
    <section className="admin-generation-panel">
      <h2>Daily practice goals</h2>
      <p className="hint">Progress uses saved simulator attempts for your local calendar day. Goals are stored in this browser and do not affect exam settings.</p>
      <div className="tiles"><div><b>{todayAttempts.length}/{goals.sessions}</b><span>Sessions today</span></div><div><b>{todayBestWpm}</b><span>Best net WPM today</span></div><div><b>{todayBestAccuracy}%</b><span>Best accuracy today</span></div><div><b>{streak} days</b><span>Practice streak</span></div></div>
      <div style={{display:"grid",gap:"1rem",marginTop:"1rem"}}>
        <div><div style={{display:"flex",justifyContent:"space-between",gap:".5rem"}}><b>Daily sessions</b><span>{todayAttempts.length} / {goals.sessions}</span></div><div style={{height:"10px",background:"var(--border, #ddd)",borderRadius:"999px",overflow:"hidden",marginTop:".35rem"}}><div style={{height:"100%",width:sessionsProgress+"%",background:"var(--accent, #2563eb)"}} /></div></div>
        <div><div style={{display:"flex",justifyContent:"space-between",gap:".5rem"}}><b>Net WPM target</b><span>{todayBestWpm} / {goals.targetWpm}</span></div><div style={{height:"10px",background:"var(--border, #ddd)",borderRadius:"999px",overflow:"hidden",marginTop:".35rem"}}><div style={{height:"100%",width:wpmProgress+"%",background:"var(--accent, #2563eb)"}} /></div></div>
        <div><div style={{display:"flex",justifyContent:"space-between",gap:".5rem"}}><b>Accuracy target</b><span>{todayBestAccuracy}% / {goals.targetAccuracy}%</span></div><div style={{height:"10px",background:"var(--border, #ddd)",borderRadius:"999px",overflow:"hidden",marginTop:".35rem"}}><div style={{height:"100%",width:accuracyProgress+"%",background:"var(--accent, #2563eb)"}} /></div></div>
      </div>
      <h3 style={{marginTop:"1.25rem"}}>Adjust your goals</h3>
      <div className="form">
        <label>Sessions per day<input type="number" min="1" max="10" value={goals.sessions} onChange={e=>setGoals(g=>({...g,sessions:Math.min(10,Math.max(1,Number(e.target.value)||1))}))} /></label>
        <label>Net WPM target<input type="number" min="1" max="200" value={goals.targetWpm} onChange={e=>setGoals(g=>({...g,targetWpm:Math.min(200,Math.max(1,Number(e.target.value)||1))}))} /></label>
        <label>Accuracy target (%)<input type="number" min="1" max="100" value={goals.targetAccuracy} onChange={e=>setGoals(g=>({...g,targetAccuracy:Math.min(100,Math.max(1,Number(e.target.value)||1))}))} /></label>
      </div>
      <p className="hint">{sessionsProgress===100&&wpmProgress===100&&accuracyProgress===100?"All three daily targets reached. Keep your rhythm consistent.":"Focus on one saved test at a time. A missed daily goal does not reset your progress history."}</p>
    </section>
    <section className="admin-generation-panel"><h2>Performance trend · last {trend.length} attempts</h2>{trend.length?<><div className="tiles"><div><b>{speedChange===null?"—":(speedChange>0?"+":"")+speedChange}</b><span>Net WPM change · first half to second half</span></div><div><b>{accuracyChange===null?"—":(accuracyChange>0?"+":"")+accuracyChange+"%"}</b><span>Accuracy change · first half to second half</span></div></div><div style={{display:"grid",gap:".8rem",marginTop:"1rem"}}>{trend.map((x,i)=><div key={x.createdAt+"-"+i} style={{display:"grid",gridTemplateColumns:"minmax(76px,auto) 1fr auto",alignItems:"center",gap:".75rem"}}><span className="hint">{new Date(x.createdAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div style={{height:"14px",borderRadius:"999px",background:"var(--border, #ddd)",overflow:"hidden"}}><div title={x.netWpm+" net WPM"} style={{height:"100%",width:Math.max(2,x.netWpm/maxWpm*100)+"%",background:"var(--accent, #2563eb)",borderRadius:"999px"}} /></div><b>{x.netWpm} WPM · {x.accuracy}%</b></div>)}</div><p className="hint">Bars show net WPM. The comparison uses the earlier and later halves of the displayed attempts; it is not an exam pass/fail judgement.</p></>:<p className="hint">Complete saved simulator attempts to build your performance trend.</p>}</section>
    <section className="admin-generation-panel"><h2>Your next actions</h2><ol>{(data.recommendations??[]).map((x,i)=><li key={i}>{x}</li>)}</ol><a className="go" href="/simulators">Start a focused practice session</a></section>
    <section className="admin-generation-panel"><h2>Weak keys</h2>{data.patterns?.weakKeys.length?<div className="tbl"><table><thead><tr><th>Key</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakKeys.map(x=><tr key={x.label}><td><b>{x.label}</b></td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">More recorded key-level attempts are needed to identify weak keys.</p>}</section>
    <section className="admin-generation-panel"><h2>Weak letter pairs</h2>{data.patterns?.weakPairs.length?<div className="tbl"><table><thead><tr><th>Pair</th><th>Errors</th><th>Attempts</th><th>Error rate</th></tr></thead><tbody>{data.patterns.weakPairs.map(x=><tr key={x.label}><td><b>{x.label}</b></td><td>{x.errors}</td><td>{x.attempts}</td><td>{x.errorRate}%</td></tr>)}</tbody></table></div>:<p className="hint">No recurring weak pair detected yet.</p>}</section>
    <section className="admin-generation-panel"><h2>Recent progress</h2>{data.attempts?.length?<div className="tbl"><table><thead><tr><th>Date</th><th>Simulator</th><th>Net WPM</th><th>Accuracy</th></tr></thead><tbody>{data.attempts.map((x,i)=><tr key={i}><td>{new Date(x.createdAt).toLocaleDateString()}</td><td>{x.simulator??"Practice"}</td><td>{x.netWpm}</td><td>{x.accuracy}%</td></tr>)}</tbody></table></div>:<p>No saved attempts yet. Start with a simulator test.</p>}</section>
  </main>;
}
