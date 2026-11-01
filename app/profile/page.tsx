"use client";
import { useEffect, useState } from "react";
import { api, post } from "@/lib/clientApi";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    api("/api/me")
      .then((r) => {
        if (r.ok) { setUser(r.data); setName(r.data.name || ""); setEmail(r.data.email || ""); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;
    setMsg("");
    setSavingProfile(true);
    try {
      const r = await post("/api/me", { name: name.trim() });
      setMsg(r.ok ? "Profile updated successfully." : r.data?.error ?? "Failed to update profile.");
      if (r.ok) { setUser({ ...user, name: name.trim() }); setName(name.trim()); }
    } catch {
      setMsg("Unable to connect. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;
    setMsg("");
    if (newPassword !== confirmPassword) { setMsg("New passwords do not match."); return; }
    if (newPassword.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    setSavingPassword(true);
    try {
      const r = await post("/api/auth/change-password", { oldPassword, newPassword });
      setMsg(r.ok ? "Password changed successfully." : r.data?.error ?? "Failed to change password.");
      if (r.ok) { setOldPassword(""); setNewPassword(""); setConfirmPassword(""); }
    } catch {
      setMsg("Unable to connect. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  if (loading) return <main className="page profile-page"><div className="profile-loading" role="status" aria-live="polite"><span className="results-loading-mark" aria-hidden="true" /><strong>Loading your account</strong><p>Retrieving your profile details…</p></div></main>;
  if (!user) return <main className="page profile-page"><section className="profile-guest"><span aria-hidden="true">◎</span><h1>Your account</h1><p>Sign in to manage your profile and account security.</p><a className="profile-primary-action" href="/login">Sign in <span aria-hidden="true">→</span></a></section></main>;

  return (
    <main className="page profile-page">
      <header className="profile-heading"><div><span className="results-eyebrow">ACCOUNT SETTINGS</span><h1>My profile</h1><p>Manage your personal details and keep your account secure.</p></div><div className="profile-avatar" aria-hidden="true">{(name || email || "U").trim().charAt(0).toUpperCase()}</div></header>
      <section className="profile-account-summary"><div className="profile-summary-avatar" aria-hidden="true">{(name || email || "U").trim().charAt(0).toUpperCase()}</div><div><strong>{name || "TypingSkillZone learner"}</strong><span>{email}</span></div><span className="profile-account-status">Account active</span></section>
      <div className="profile-settings-layout">
        <nav className="profile-settings-nav" aria-label="Account settings">
          <button type="button" role="tab" aria-selected={tab === "profile"} className={tab === "profile" ? "active" : ""} onClick={() => { setTab("profile"); setMsg(""); }}><span>◎</span><span><strong>Personal details</strong><small>Update your name</small></span><b>›</b></button>
          <button type="button" role="tab" aria-selected={tab === "password"} className={tab === "password" ? "active" : ""} onClick={() => { setTab("password"); setMsg(""); }}><span>⌑</span><span><strong>Password & security</strong><small>Change your password</small></span><b>›</b></button>
        </nav>
        <section className="profile-settings-panel">
          {msg && <p className="profile-feedback" role="status" aria-live="polite">{msg}</p>}
          {tab === "profile" ? <form onSubmit={updateProfile} className="profile-form">
            <div className="profile-form-heading"><span className="results-eyebrow">PERSONAL INFORMATION</span><h2>Profile details</h2><p>Keep your display name up to date.</p></div>
            <label>Full name<input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" /></label>
            <label>Email address<input type="email" value={email} disabled autoComplete="email" /><small>Your email is used for account access and cannot be changed here.</small></label>
            <div className="profile-form-actions"><button type="submit" className="profile-primary-action" disabled={savingProfile || !name.trim()}>{savingProfile ? "Saving…" : "Save changes"}</button></div>
          </form> : <form onSubmit={changePassword} className="profile-form">
            <div className="profile-form-heading"><span className="results-eyebrow">ACCOUNT SECURITY</span><h2>Change password</h2><p>Choose a strong password of at least 8 characters.</p></div>
            <label>Current password<input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required autoComplete="current-password" /></label>
            <label>New password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
            <label>Confirm new password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
            <div className="profile-password-hint">Use a unique password that you do not use on other websites.</div>
            <div className="profile-form-actions"><button type="submit" className="profile-primary-action" disabled={savingPassword || !oldPassword || !newPassword || !confirmPassword}>{savingPassword ? "Updating…" : "Update password"}</button></div>
          </form>}
        </section>
      </div>
      <section className="profile-signout-panel"><div><strong>Sign out of TypingSkillZone</strong><p>End your current session on this device.</p></div><button type="button" className="profile-signout-action" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></section>
    </main>
  );
}
