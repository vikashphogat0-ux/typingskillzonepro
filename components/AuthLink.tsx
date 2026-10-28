"use client";
import { useEffect, useState } from "react";
export default function AuthLink() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null | undefined>(undefined);
  useEffect(() => { fetch("/api/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => setUser(d ?? null)).catch(() => setUser(null)); }, []);
  if (user === undefined) return null;
  if (!user) return <a href="/login">Sign in</a>;
  return <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <a href="/dashboard">{user.name ?? user.email}</a>
    <button className="navbtn" onClick={async () => { await fetch("/api/auth/sign-out", { method: "POST" }); window.location.href = "/"; }}>Sign out</button>
  </span>;
}
