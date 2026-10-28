"use client";
import { useState } from "react";
type Mode = "in" | "up" | "forgot" | "forgot-sent";

export default function Login() {
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const clear = () => setErr("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); clear();
    try {
      let endpoint = "/api/auth/sign-in/email";
      let payload: Record<string, string> = { email: email.trim().toLowerCase(), password };
      if (mode === "up") {
        endpoint = "/api/auth/sign-up/email";
        payload = { ...payload, name: name.trim() || email.split("@")[0] };
      } else if (mode === "forgot") {
        endpoint = "/api/auth/request-password-reset";
        payload = { email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/reset-password` };
      }
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        const message = data?.message ?? data?.error?.message ?? data?.error ?? "Authentication failed. Check your details and try again.";
        setErr(typeof message === "string" ? message : "Authentication failed. Check your details and try again.");
        return;
      }
      if (mode === "forgot") { setMode("forgot-sent"); return; }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") ? next : "/dashboard";
    } catch {
      setErr("Unable to connect to Neon Auth. Check the authentication URL and try again.");
    } finally { setBusy(false); }
  };

  if (mode === "forgot-sent") return <div className="page setup"><h1>Check your email</h1><p>If your address is registered, Neon Auth will send a password-reset email to <b>{email}</b>.</p><p><button className="link" onClick={() => { setMode("in"); clear(); }}>Back to sign in</button></p></div>;

  return <div className="page setup">
    <h1>{mode === "in" ? "Sign in" : mode === "up" ? "Create a new account" : "Reset password"}</h1>
    <p className="hint">Secure sign-in powered by Neon Auth.</p>
    <form onSubmit={submit} className="form">
      {mode === "up" && <label>Name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>}
      <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
      {mode !== "forgot" && <label>Password<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="go" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}</button>
    </form>
    <p style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
      {mode === "in" ? <><button className="link" onClick={() => { setMode("up"); clear(); }}>Create a new account</button><button className="link" onClick={() => { setMode("forgot"); clear(); }}>Forgot password?</button></> : <button className="link" onClick={() => { setMode("in"); clear(); }}>Back to sign in</button>}
    </p>
  </div>;
}
