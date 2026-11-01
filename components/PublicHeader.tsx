"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AuthLink from "@/components/AuthLink";

const links = [
  ["/", "Home"],
  ["/exams", "Exams"],
  ["/dashboard", "My Results"],
  ["/faqs", "FAQs"],
  ["/blog", "Blog"],
  ["/pricing", "Pricing"],
  ["/institution", "For Institutes"],
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <header className="public-header home-reference-header">
      <div className="public-header-inner">
        <a href="/" className="public-brand" aria-label="Typing Skill Zone home">
          <span className="public-brand-mark">TS</span>
          <span><strong>Typing Skill Zone</strong><small>EXAM-READY TYPING PRACTICE</small></span>
        </a>
        <button ref={toggleRef} type="button" className="mobile-nav-toggle" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="public-primary-navigation" aria-label={open ? "Close navigation" : "Open navigation"}>☰</button>
        <nav id="public-primary-navigation" className={open ? "public-nav is-open" : "public-nav"} aria-label="Main navigation">
          {links.map(([href, label]) => (
            <a key={href} href={href} aria-current={pathname === href || (href !== "/" && pathname.startsWith(href + "/")) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <span className="public-auth"><AuthLink /></span>
        </nav>
      </div>
    </header>
  );
}
