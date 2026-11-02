"use client";
import { useState } from "react";
import { post } from "@/lib/clientApi";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus("");

    try {
      const r = await post("/api/feedback", { ...form, type: "contact" });
      setStatus(r.ok ? "Thank you! We'll respond within 24-48 hours." : r.data.error ?? "Failed to send. Please try again.");
      if (r.ok) setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("We could not send your message. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page contact-page">
      <header className="contact-hero">
        <span className="public-kicker">TYPINGSKILLZONE SUPPORT</span>
        <h1>Contact Us</h1>
        <p>Get help with your account, exam practice, technical issues or subscription.</p>
      </header>

      <section className="contact-panel">
        <h2>Send us a message</h2>
        <p>Have questions about our platform, exam rules, or your subscription? We're here to help.</p>

        <form onSubmit={submit} className="form contact-form">
          <label>
            Your Name
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Email Address
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Subject
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Question about exams, technical issue, feedback..."
            />
          </label>
          <label>
            Message
            <textarea
              required
              rows={6}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>
          {status && <p className="flash-msg contact-feedback" role="status" aria-live="polite">{status}</p>}
          <button type="submit" className="go contact-submit" disabled={busy}>
            {busy ? "Sending..." : "Send Message"}
          </button>
        </form>
      </section>

      <section className="contact-faq">
        <div className="contact-section-heading"><span className="public-kicker">HELP CENTRE</span><h2>Common Questions</h2></div>
        <div className="faq">
          <div>
            <h3>How accurate are the exam simulators?</h3>
            <p>Our simulators use scoring profiles based on official notifications. We clearly label any unverified settings. Always cross-check with your exam's official notification.</p>
          </div>
          <div>
            <h3>Can I practice offline?</h3>
            <p>The typing simulator requires an internet connection for scoring validation and result storage. However, the passage library offers downloadable text files for offline practice.</p>
          </div>
          <div>
            <h3>How do institution accounts work?</h3>
            <p>Typing centers can register their institute. Once approved by our admin, they get a join code to share with students. Students then get unlimited tests and progress tracking.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
