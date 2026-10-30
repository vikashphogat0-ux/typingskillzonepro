"use client";

import { useState } from "react";
import AuthLink from "@/components/AuthLink";

const links = [
  ["/exams", "Exams"], ["/exam-results", "Exam Results"], ["/faqs", "FAQs"],
  ["/blog", "Blog"], ["/pricing", "Pricing"]
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  return <header className="public-header">
    <div className="public-header-inner">
      <a href="/" className="public-brand"><span className="public-brand-mark">TS</span><span><strong>Typing Skill Zone</strong><small>EXAM-READY TYPING PRACTICE</small></span></a>
      <button className="mobile-nav-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">☰</button>
      <nav className={open ? "public-nav is-open" : "public-nav"} aria-label="Main navigation">
        {links.map(([href,label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        <a href="/library" onClick={() => setOpen(false)}>Passage Library</a>
        <a href="/institution" onClick={() => setOpen(false)}>For Institutes</a>
        <span className="public-auth"><AuthLink /></span>
      </nav>
    </div>
  </header>;
}
