"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AuthLink from "@/components/AuthLink";

const links = [
  ["/exams", "Exams"],
  ["/simulators", "Simulators"],
  ["/library", "Passage Library"],
  ["/test", "Practice"],
  ["/dashboard", "My Results"],
  ["/pricing", "Pricing"],
  ["/institution", "Institutes"],
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "/";
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <a href="/" className="public-brand" aria-label="Typing Skill Zone home">
          <span className="public-brand-mark">TS</span>
          <span><strong>Typing Skill Zone</strong><small>EXAM-READY TYPING PRACTICE</small></span>
        </a>
        <button className="mobile-nav-toggle" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Toggle navigation">☰</button>
        <nav className={open ? "public-nav is-open" : "public-nav"} aria-label="Main navigation">
          {links.map(([href, label]) => (
            <a key={href} href={href} aria-current={pathname === href || (href !== "/" && pathname.startsWith(href + "/")) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <span className="public-auth"><AuthLink /></span>
        </nav>
      </div>
    </header>
  );
}
