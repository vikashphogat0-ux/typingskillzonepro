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

  useEffect(() => {
    api("/api/me")
      .then((r) => {
        if (r.ok) { setUser(r.data); setName(r.data.name || ""); setEmail(r.data.email || ""); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    const r = await post("/api/me", { name });
    setMsg(r.ok ? "Profile updated." : r.data?.error ?? "Failed to update profile.");
    if (r.ok) setUser({ ...user, name });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    if (newPassword !== confirmPassword) { setMsg("New passwords do not match."); return; }
    if (newPassword.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    const r = await post("/api/auth/change-password", { oldPassword, newPassword });
    setMsg(r.ok ? "Password changed successfully." : r.data?.error ?? "Failed to change password.");
    if (r.ok) { setOldPassword(""); setNewPassword(""); setConfirmPassword(""); }
  };

  const signOut = () =>
    fetch("/api/auth/signout", { method: "POST" }).then(() => { window.location.href = "/"; });

  if (loading) return <div className="page"><p>Loading…</p></div>;
  if (!user) return <div className="page"><h1>Profile</h1><p><a href="/login">Sign in</a> to view your profile.</p></div>;

  return (
    <div className="page">
      <h1>My Profile</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>Profile</button>
        <button role="tab" aria-selected={tab === "password"} onClick={() => setTab("password")}>Password</button>
      </div>
      {msg && <p className="flash-msg" role="status">{msg}</p>}

      {tab === "profile" && (
        <form onSubmit={updateProfile} className="form">
          <h2>Account Information</h2>
          <label>Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Email<input type="email" value={email} disabled /></label>
          <p className="hint">Email cannot be changed. Contact support if you need to update it.</p>
          <button type="submit" className="go">Save Changes</button>
        </form>
      )}

      {tab === "password" && (
        <form onSubmit={changePassword} className="form">
          <h2>Change Password</h2>
          <label>Current Password
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
          </label>
          <label>New Password (8+ characters)
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </label>
          <label>Confirm New Password
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
          </label>
          <button type="submit" className="go">Change Password</button>
        </form>
      )}

      <div className="form" style={{ marginTop: 40, paddingTop: 40, borderTop: "1px solid var(--line)" }}>
        <h2>Account Actions</h2>
        <p><button className="link" onClick={signOut}>Sign Out</button></p>
      </div>
    </div>
  );
}
