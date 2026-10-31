"use client";
import { useCallback, useEffect, useState } from "react";

type Mode = "in" | "up" | "verify" | "forgot" | "forgot-sent";

function safeMessage(data: any): string {
  const value = data?.message ?? data?.error?.message ?? data?.error;
  return typeof value === "string"
    ? value
    : "The request could not be completed. Check the details and try again.";
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const clear = () => { setErr(""); setNotice(""); };

  const finishSignIn = useCallback(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
  }, []);

  // Keep /login consistent with the shared header/sidebar session state.
  // A transient API error must not be mistaken for a signed-out session.
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
        if (active && response.ok) finishSignIn();
      } catch {
        // Keep the sign-in form usable if the session endpoint is temporarily unavailable.
      }
    };
    void checkSession();
    return () => { active = false; };
  }, [finishSignIn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    clear();
    try {
      const normalizedEmail = email.trim().toLowerCase();
      let endpoint = "/api/auth/sign-in/email";
      let payload: Record<string, string> = { email: normalizedEmail, password };

      if (mode === "up") {
        endpoint = "/api/auth/sign-up/email";
        payload = { ...payload, name: name.trim() || normalizedEmail.split("@")[0] };
      } else if (mode === "forgot") {
        endpoint = "/api/auth/request-password-reset";
        payload = { email: normalizedEmail, redirectTo: `${window.location.origin}/reset-password` };
      } else if (mode === "verify") {
        endpoint = "/api/auth/email-otp/verify-email";
        payload = { email: normalizedEmail, otp: otp.trim() };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setErr(safeMessage(data));
        return;
      }

      if (mode === "forgot") {
        setMode("forgot-sent");
        setNotice("");
        return;
      }
      if (mode === "up") {
        // Neon Auth's branch configuration determines whether signup requires
        // verification. Offer the OTP step; do not assume a session means the
        // mailbox has been verified.
        setMode("verify");
        setOtp("");
        setNotice("If email verification is enabled on this Neon Auth branch, enter the verification code sent to your email. You can request a new code below.");
        return;
      }
      if (mode === "verify") {
        setNotice("Email verified. Continuing to your account…");
      }
      finishSignIn();
    } catch {
      setErr("Unable to connect to Neon Auth. Check the authentication URL and try again.");
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);
    clear();
    try {
      const res = await fetch("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ email: email.trim().toLowerCase(), type: "email-verification" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setErr(safeMessage(data));
        return;
      }
      setNotice("If this address can receive a verification code, Neon Auth has accepted the request. Check your inbox and spam folder.");
    } catch {
      setErr("Unable to request a verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "forgot-sent") {
    return <div className="page setup auth-page">
      <h1>Check your email</h1>
      <p>If this address is registered, Neon Auth will send password-reset instructions to <b>{email}</b>.</p>
      <p><button type="button" className="link" onClick={() => { setMode("in"); clear(); }}>Back to sign in</button></p>
    </div>;
  }

  return <div className="page setup">
    <h1>{mode === "in" ? "Sign in" : mode === "up" ? "Create a new account" : mode === "verify" ? "Verify your email" : "Reset password"}</h1>
    <p className="hint">Secure sign-in powered by Neon Auth.</p>
    <form onSubmit={submit} className="form">
      {mode === "up" && <label>Name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={100} /></label>}
      <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" readOnly={mode === "verify"} /></label>
      {mode === "in" || mode === "up" ? (
        <label>Password<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>
      ) : null}
      {mode === "verify" && <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,8}" minLength={4} maxLength={8} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter email code" /></label>}
      {notice && <p className="hint" role="status">{notice}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="go" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : mode === "verify" ? "Verify email" : "Send reset instructions"}</button>
    </form>
    {mode === "verify" && <p style={{ marginTop: 12 }}><button type="button" className="link" disabled={busy} onClick={() => void resendCode()}>Resend verification code</button></p>}
    <p style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
      {mode === "in" ? <>
        <button type="button" className="link" onClick={() => { setMode("up"); clear(); }}>Create a new account</button>
        <button type="button" className="link" onClick={() => { setMode("forgot"); clear(); }}>Forgot password?</button>
      </> : <button type="button" className="link" onClick={() => { setMode("in"); clear(); }}>Back to sign in</button>}
    </p>
  </div>;
}
