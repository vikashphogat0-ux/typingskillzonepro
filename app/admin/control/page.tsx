"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UserRow = { id:string; name:string|null; email:string; role:string; created_at:string; plan:string|null; tests:number; last_test:string|null };
type InstituteRow = { id:string; name:string; city:string|null; state:string|null; owner_email:string; phone:string|null; students:number; status:string; created_at:string };
type PassageRow = { id:string; title:string; language:string; word_count:number; created_at:string; preview:string; template:string|null };
type TemplateRow = { id:string; slug:string; name:string; language:string; duration_sec:number; is_active:boolean };
type SubscriptionRow = { email:string; status:string; ends_at:string; is_pro:boolean };

async function request<T>(url:string, init?:RequestInit):Promise<{ok:boolean;status:number;data:T}> {
  const response = await fetch(url, init);
  const data = await response.json().catch(()=>({})) as T;
  return {ok:response.ok,status:response.status,data};
}
const jsonPost = (url:string, body:unknown) => request(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});

export default function AdminControlCentre(){
  const [users,setUsers]=useState<UserRow[]>([]);
  const [institutes,setInstitutes]=useState<InstituteRow[]>([]);
  const [passages,setPassages]=useState<PassageRow[]>([]);
  const [templates,setTemplates]=useState<TemplateRow[]>([]);
  const [subscriptions,setSubscriptions]=useState<SubscriptionRow[]>([]);
  const [query,setQuery]=useState("");
  const [tab,setTab]=useState<"overview"|"users"|"institutes"|"content"|"automation">("overview");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const load=useCallback(async()=>{
    setBusy(true);setError("");
    try{
      const results=await Promise.all([
        request<UserRow[]>("/api/admin/users"),
        request<InstituteRow[]>("/api/admin/institutions"),
        request<PassageRow[]>("/api/admin/passages"),
        request<TemplateRow[]>("/api/admin/templates"),
        request<SubscriptionRow[]>("/api/admin/subscriptions"),
      ]);
      const denied=results.find(x=>x.status===403);
      if(denied){setError("Your session does not have administrator permissions. Sign in with an account whose users.role is admin.");return;}
      if(results.some(x=>!x.ok)){setError("Some control-centre data could not be loaded. Check the failed API endpoint and server logs.");return;}
      setUsers(results[0].data);setInstitutes(results[1].data);setPassages(results[2].data);setTemplates(results[3].data);setSubscriptions(results[4].data);
    }catch{setError("Network error while loading control-centre data.");}
    finally{setBusy(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  const filteredUsers=useMemo(()=>users.filter(u=>!query||[u.name,u.email,u.role,u.plan].some(v=>String(v??"").toLowerCase().includes(query.toLowerCase()))),[users,query]);
  const metrics=[
    {label:"Registered users",value:users.length,detail:"Application user records"},
    {label:"Passage records",value:passages.length,detail:"Latest 200 returned by API"},
    {label:"Exam templates",value:templates.length,detail:"Built-in and custom templates"},
    {label:"Institutes",value:institutes.length,detail:"Registered institute accounts"},
  ];
  const changeRole=async(user:UserRow,role:"student"|"admin")=>{
    if(user.role===role)return;
    if(!confirm(`Change ${user.email} role to ${role}? This changes administrator access.`))return;
    const r=await jsonPost("/api/admin/users",{id:user.id,role});
    setNotice(r.ok?"User role updated.":(r.data as any)?.error??"Could not update role.");
    if(r.ok)await load();
  };
  const setInstitute=async(row:InstituteRow,status:"approved"|"suspended")=>{
    if(!confirm(`${status==="approved"?"Approve":"Suspend"} ${row.name}?`))return;
    const r=await jsonPost("/api/admin/institutions",{id:row.id,status});
    setNotice(r.ok?"Institute status updated.":(r.data as any)?.error??"Could not update institute.");
    if(r.ok)await load();
  };
  const runGeneration=async(slot:"morning"|"afternoon"|"live")=>{
    if(!confirm(`Start the ${slot} AI passage generation batch now?`))return;
    setBusy(true);setNotice("");
    try{
      const r=await jsonPost("/api/admin/passages/generate",{slot});
      setNotice(r.ok?`Generation request completed. Created: ${(r.data as any)?.generated??"see result"}.`:(r.data as any)?.error??"Generation failed.");
      if(r.ok)await load();
    }catch{setNotice("Network error while starting generation.");}
    finally{setBusy(false);}
  };

  return <div className="page admin admin-control">
    <div className="control-heading">
      <div><span className="eyebrow">TYPINGSKILLZONE · PLATFORM OPERATIONS</span><h1>Admin Control Centre</h1><p>Manage platform operations using the existing secured administration APIs.</p></div>
      <div className="control-actions"><button className="go alt" onClick={()=>void load()} disabled={busy}>{busy?"Refreshing…":"↻ Refresh data"}</button><a className="go" href="/admin">Passage manager ↗</a></div>
    </div>
    {error&&<div className="empty-state" role="alert"><strong>Access or data error</strong><p>{error}</p><a className="go alt" href="/login">Sign in</a></div>}
    {notice&&<p className="flash-msg" role="status">{notice}</p>}
    <div className="control-tabs" role="tablist" aria-label="Admin modules">
      {(["overview","users","institutes","content","automation"] as const).map(key=><button key={key} role="tab" aria-selected={tab===key} onClick={()=>setTab(key)}>{key==="overview"?"Overview":key==="users"?"Users":key==="institutes"?"Institutes":key==="content"?"Content & exams":"AI automation"}</button>)}
    </div>
    {tab==="overview"&&<>
      <div className="control-metrics">{metrics.map(m=><article className="control-metric" key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small>{m.detail}</small></article>)}</div>
      <div className="control-grid">
        <article className="control-panel"><div className="control-panel-head"><div><span className="eyebrow">ACCESS & ACCOUNTS</span><h2>User administration</h2></div><button className="link" onClick={()=>setTab("users")}>Manage users →</button></div><p>Search user records, inspect plan and activity metadata, and change the existing student/admin role.</p><strong>{users.filter(u=>u.role==="admin").length} administrators</strong></article>
        <article className="control-panel"><div className="control-panel-head"><div><span className="eyebrow">CONTENT OPERATIONS</span><h2>Passages & exams</h2></div><a href="/admin" className="text-link">Open manager →</a></div><p>Manage passage uploads and exam templates. Historical passage and test references are protected by existing API rules.</p><strong>{passages.length} recent passages · {templates.length} templates</strong></article>
        <article className="control-panel"><div className="control-panel-head"><div><span className="eyebrow">INSTITUTE OPERATIONS</span><h2>Institute approvals</h2></div><button className="link" onClick={()=>setTab("institutes")}>Review institutes →</button></div><p>Approve pending institutes or suspend an existing institute using the secured institute API.</p><strong>{institutes.filter(i=>i.status==="pending").length} pending approvals</strong></article>
        <article className="control-panel"><div className="control-panel-head"><div><span className="eyebrow">BILLING OPERATIONS</span><h2>Subscriptions</h2></div><a href="/admin/subscribers" className="text-link">Open subscribers →</a></div><p>Review subscription records and use the existing subscriber tools to grant or revoke Pro access.</p><strong>{subscriptions.filter(s=>s.is_pro).length} active Pro accounts</strong></article>
      </div>
    </>}
    {tab==="users"&&<section className="control-panel"><div className="control-panel-head"><div><span className="eyebrow">ACCOUNT DIRECTORY</span><h2>User management</h2><p>Latest users returned by the admin API. Role changes are permission-sensitive.</p></div><input aria-label="Search users" placeholder="Search name, email, role or plan…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="tbl"><table><thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Tests</th><th>Joined</th><th>Access</th></tr></thead><tbody>{filteredUsers.map(u=><tr key={u.id}><td><strong>{u.name||"Unnamed user"}</strong><br/><small>{u.email}</small></td><td>{u.role}</td><td>{u.plan||"Free"}</td><td>{u.tests}</td><td>{new Date(u.created_at).toLocaleDateString("en-IN")}</td><td><select aria-label={`Role for ${u.email}`} value={u.role} onChange={e=>void changeRole(u,e.target.value as "student"|"admin")}><option value="student">Student</option><option value="admin">Admin</option></select></td></tr>)}{!filteredUsers.length&&<tr><td colSpan={6}>No matching users.</td></tr>}</tbody></table></div></section>}
    {tab==="institutes"&&<section className="control-panel"><div className="control-panel-head"><div><span className="eyebrow">INSTITUTE DIRECTORY</span><h2>Institute approvals & status</h2></div><a href="/admin/institutions" className="text-link">Full institute view →</a></div><div className="tbl"><table><thead><tr><th>Institute</th><th>Owner</th><th>Location</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead><tbody>{institutes.map(i=><tr key={i.id}><td><strong>{i.name}</strong><br/><small>{new Date(i.created_at).toLocaleDateString("en-IN")}</small></td><td>{i.owner_email}</td><td>{[i.city,i.state].filter(Boolean).join(", ")||"—"}</td><td>{i.students}</td><td>{i.status}</td><td>{i.status!=="approved"?<button className="link" onClick={()=>void setInstitute(i,"approved")}>Approve</button>:<button className="link" onClick={()=>void setInstitute(i,"suspended")}>Suspend</button>}</td></tr>)}{!institutes.length&&<tr><td colSpan={6}>No institutes found.</td></tr>}</tbody></table></div></section>}
    {tab==="content"&&<section className="control-grid"><article className="control-panel"><span className="eyebrow">PASSAGE LIBRARY</span><h2>Passage management</h2><strong>{passages.length} recent records</strong><p>Upload, validate, search and manage passage records using the existing passage manager.</p><a className="go" href="/admin">Open passage manager</a></article><article className="control-panel"><span className="eyebrow">EXAM CONFIGURATION</span><h2>Exam templates</h2><strong>{templates.length} templates</strong><p>Configure custom duration, language, display mode, backspace policy and scoring profile.</p><a className="go alt" href="/admin">Manage templates</a></article></section>}
    {tab==="automation"&&<section className="control-panel"><span className="eyebrow">SCHEDULED CONTENT</span><h2>AI passage generation</h2><p>Start the configured Groq generation batches. This uses the existing server-side provider configuration and database persistence; secrets are never displayed here.</p><div className="cta-group"><button className="go" disabled={busy} onClick={()=>void runGeneration("morning")}>Generate morning batch</button><button className="go" disabled={busy} onClick={()=>void runGeneration("afternoon")}>Generate afternoon batch</button><button className="go alt" disabled={busy} onClick={()=>void runGeneration("live")}>Generate live-exam batch</button></div><p className="hint">Generation requires GROQ_API_KEY, GROQ_MODEL and the existing passage-generation database migration to be configured in the Worker.</p></section>}
    <div className="control-footnote"><strong>Security boundary:</strong> this control centre currently uses the repository’s existing <code>users.role = 'admin'</code> authorization. It does not introduce a separate super_admin role or expose unimplemented CMS, payment-provider, secret-management or infrastructure controls.</div>
  </div>;
}
