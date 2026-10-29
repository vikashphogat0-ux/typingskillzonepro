"use client";

import { useCallback, useEffect, useState } from "react";

type CurrentUser = { id?: string; name?: string | null; email?: string | null };
type Props = { variant?: "header" | "sidebar" };

async function readCurrentUser(): Promise<{ user: CurrentUser | null; unavailable: boolean }> {
  try {
    const response = await fetch("/api/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) return { user: null, unavailable: false };
    if (!response.ok) return { user: null, unavailable: true };
    const data = await response.json().catch(() => null);
    const user = data?.user ?? data;
    if (!user || (!user.id && !user.email)) return { user: null, unavailable: true };
    return { user, unavailable: false };
  } catch {
    return { user: null, unavailable: true };
  }
}

export default function AuthLink({ variant = "header" }: Props) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (busy) return;
    const result = await readCurrentUser();
    setUser(result.user);
    setUnavailable(result.unavailable);
  }, [busy]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await readCurrentUser();
      if (!mounted) return;
      setUser(result.user);
      setUnavailable(result.unavailable);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("pageshow", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("pageshow", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(typeof data?.message === "string" ? data.message : "The sign-out request was rejected. Please try again.");
      }

      // Verify against the same server-side session endpoint used by protected routes.
      // Do not redirect and leave a stale signed-in UI if the cookie is still active.
      const verification = await readCurrentUser();
      if (verification.unavailable) {
        throw new Error("Sign-out was sent, but the session could not be verified. Please retry.");
      }
      if (verification.user) {
        setUser(verification.user);
        throw new Error("Your session is still active. Please try signing out once more.");
      }

      setUser(null);
      setUnavailable(false);
      window.location.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign out. Check your connection and try again.");
      const current = await readCurrentUser();
      setUser(current.user);
      setUnavailable(current.unavailable);
    } finally {
      setBusy(false);
    }
  };

  const isSidebar = variant === "sidebar";
  if (user === undefined && !unavailable) {
    return <span className={isSidebar ? "auth-sidebar-status" : "auth-header-status"} role="status">Checking session…</span>;
  }
  if (unavailable && !user) {
    return (
      <span className={isSidebar ? "auth-sidebar-wrap" : "auth-header-wrap"}>
        <button type="button" className={isSidebar ? "auth-sidebar-button" : "navbtn"} onClick={() => { setUnavailable(false); setUser(undefined); void refresh(); }} disabled={busy}>
          Retry account status
        </button>
        {message && <small role="alert">{message}</small>}
      </span>
    );
  }
  if (!user) {
    return <a className={isSidebar ? "auth-sidebar-link" : undefined} href="/login">Sign in</a>;
  }

  const label = user.name?.trim() || user.email || "My account";
  return (
    <span className={isSidebar ? "auth-sidebar-wrap" : "auth-header-wrap"}>
      <a className={isSidebar ? "auth-sidebar-link" : undefined} href="/dashboard" title={user.email ?? label}>
        {isSidebar ? "My account" : label}
      </a>
      <button type="button" className={isSidebar ? "auth-sidebar-button" : "navbtn"} onClick={() => void signOut()} disabled={busy}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {message && <small className="auth-status-message" role="alert">{message}</small>}
    </span>
  );
}
