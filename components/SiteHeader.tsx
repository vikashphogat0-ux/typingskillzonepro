"use client";

import { useState } from "react";
import AuthLink from "@/components/AuthLink";

const links = [
  { href: "/", label: "Home" },
  { href: "/simulators", label: "Exam Simulators" },
  { href: "/test", label: "Practice" },
  { href: "/library", label: "Passage Library" },
  { href: "/learn", label: "Learn Typing" },
  { href: "/institution", label: "For Institutes" },
  { href: "/dashboard", label: "My Results" },
  { href: "/pricing", label: "Plans" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <a href="/" className="site-brand" aria-label="Typing Skill Zone home">
        <span className="site-brand-mark" aria-hidden="true">T<span>.</span></span>
        <span className="site-brand-copy"><strong>TypingSkillZone</strong><small>TRAIN SMART. TYPE FASTER.</small></span>
      </a>
      <button type="button" className="site-menu-toggle" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(v => !v)}>
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>{menuOpen ? "Close menu" : "Menu"}
      </button>
      <nav id="primary-navigation" className={menuOpen ? "site-nav site-nav-open" : "site-nav"} aria-label="Main navigation">
        {links.map((link) => <a key={link.href} href={link.href} className={link.href === "/" ? "site-nav-home" : undefined} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
        <div className="site-nav-auth" onClick={() => setMenuOpen(false)}><AuthLink /></div>
      </nav>
    </header>
  );
}
