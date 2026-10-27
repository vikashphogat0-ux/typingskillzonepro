"use client";
import { useEffect, useState } from "react";

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (password !== confirm) { setErr("Passwords do not match."); return; }
    if (!token) { setErr("Reset token is missing. Use the link from your email."); return; }
    setBusy(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Could not reset password. The link may have expired.");
    setDone(true);
  };

  if (done) return (
    <div className="page setup">
      <h1>Password reset</h1>
      <p>Your password has been changed. <a href="/login">Sign in</a></p>
    </div>
  );

  return (
    <div className="page setup">
      <h1>Set new password</h1>
      {!token && <p className="err">No reset token found. Use the link from your email.</p>}
      <form onSubmit={submit} className="form">
        <label>New password (8+ characters)
          <input type="password" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>
        <label>Confirm password
          <input type="password" required minLength={8} value={confirm}
            onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="go" disabled={busy || !token}>{busy ? "Saving…" : "Set new password"}</button>
      </form>
    </div>
  );
}
