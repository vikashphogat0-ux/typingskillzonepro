"use client";

import { usePathname } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const compact = pathname === "/test" || pathname.startsWith("/simulators/");
  return (
    <div className={compact ? "tsz-app-shell tsz-app-shell--compact" : "tsz-app-shell"}>
      {!compact && <PublicHeader />}
      <div className="tsz-main-column">
        <main className="tsz-content">{children}</main>
      </div>
      {!compact && <footer className="footer">
        <div className="footer-content">
          <div className="footer-section"><h4>Typing Skill Zone</h4><p>Exam-focused English and Hindi typing practice, exam-specific simulators and measurable preparation.</p></div>
          <div className="footer-section"><h4>Practice</h4><ul><li><a href="/exams">Exam catalogue</a></li><li><a href="/simulators">Exam simulators</a></li><li><a href="/test">Free practice</a></li><li><a href="/library">Passage library</a></li></ul></div>
          <div className="footer-section"><h4>Your workspace</h4><ul><li><a href="/dashboard">Dashboard & results</a></li><li><a href="/profile">Profile</a></li><li><a href="/pricing">Plans</a></li><li><a href="/institution">For institutes</a></li></ul></div>
          <div className="footer-section"><h4>Support</h4><ul><li><a href="/faqs">FAQs</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li></ul></div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} Typing Skill Zone. Independent exam preparation platform; not affiliated with any government recruitment body.</div>
      </footer>}
    </div>
  );
}
