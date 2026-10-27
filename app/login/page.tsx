"use client";
import { useState } from "react";

type Mode = "in" | "up" | "forgot" | "forgot-sent";

export default function Login() {
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const clear = () => { setErr(""); setNote(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); clear();

    if (mode === "forgot") {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "/reset-password" }),
      });
      setBusy(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return setErr(j.error ?? "Could not send reset email. Try again.");
      }
      setMode("forgot-sent");
      return;
    }

    const endpoint = mode === "up" ? "/api/auth/signup" : "/api/auth/signin";
    const payload = mode === "up"
      ? { email, password, name: name || email.split("@")[0] }
      : { email, password };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return setErr(j.error ?? "Could not sign in. Check your details and try again.");
    if (mode === "up") setNote("Account created — signing you in…");
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") ? next : "/dashboard";
  };

  if (mode === "forgot-sent") return (
    <div className="page setup">
      <h1>Check your email</h1>
      <p>If an account exists for <b>{email}</b>, we sent a password-reset link. Check your inbox and spam folder.</p>
      <p><button className="link" onClick={() => { setMode("in"); clear(); }}>Back to sign in</button></p>
    </div>
  );

  return (
    <div className="page setup">
      <h1>{mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Reset password"}</h1>
      <form onSubmit={submit} className="form">
        {mode === "up" && (
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        )}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        {mode !== "forgot" && (
          <label>
            {mode === "up" ? "Password (8+ characters)" : "Password"}
            <input type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </label>
        )}
        {err && <p className="err" role="alert">{err}</p>}
        {note && <p role="status">{note}</p>}
        <button className="go" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
        </button>
      </form>
      <p style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
        {mode === "in" && (
          <>
            <button className="link" onClick={() => { setMode("up"); clear(); }}>New here? Create account</button>
            <button className="link" onClick={() => { setMode("forgot"); clear(); }}>Forgot password?</button>
          </>
        )}
        {mode !== "in" && (
          <button className="link" onClick={() => { setMode("in"); clear(); }}>Back to sign in</button>
        )}
      </p>
    </div>
  );
}
