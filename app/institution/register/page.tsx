"use client";
import { useState } from "react";
import { post } from "@/lib/clientApi";
import { validateInstitution } from "@/lib/institution";

export default function RegisterInstitute() {
  const [f, setF] = useState({ name: "", city: "", state: "", phone: "", address: "", contactEmail: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const problems = validateInstitution(f);
    if (problems.length) return setErr(problems.join(" "));
    setBusy(true);
    const r = await post("/api/institution", f);
    setBusy(false);
    if (r.ok) window.location.href = "/institution";
    else setErr(r.status === 401 ? "Sign in first, then register your institute." : r.data.error ?? "Could not register.");
  };

  return (
    <div className="page setup">
      <h1>Register your typing centre</h1>
      <p className="hint">Create a free account or sign in first, then submit your institute details. Registration stays pending until an admin approves it. After approval, you get a student join code, batches, assignments, progress reports and an institute leaderboard.</p>
      <p><a href="/login?next=%2Finstitution%2Fregister">Sign in or create an account</a></p>
      <form onSubmit={submit} className="form">
        <label>Institute name<input value={f.name} onChange={(e) => set("name", e.target.value)} required /></label>
        <label>City<input value={f.city} onChange={(e) => set("city", e.target.value)} required /></label>
        <label>State<input value={f.state} onChange={(e) => set("state", e.target.value)} required /></label>
        <label>Phone<input inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} required /></label>
        <label>Address (optional)<input value={f.address} onChange={(e) => set("address", e.target.value)} /></label>
        <label>Contact email (optional)<input type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></label>
        {err && <p className="err" role="alert">{err} {err.startsWith("Sign in") && <a href="/login?next=%2Finstitution%2Fregister">Sign in or create an account</a>}</p>}
        <button className="go" disabled={busy}>{busy ? "Sending…" : "Register institute"}</button>
      </form>
    </div>
  );
}
