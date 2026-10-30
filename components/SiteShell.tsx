"use client";

import { usePathname } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";

const publicRoutes = ["/", "/exams", "/exam-results", "/faqs", "/blog", "/pricing", "/about", "/contact", "/terms", "/privacy", "/learn", "/institution", "/institutions"];
const appLinks = [
  ["/dashboard", "My results"],
  ["/simulators", "Exam simulators"],
  ["/test", "Practice"],
  ["/library", "Passage library"],
  ["/profile", "Profile"],
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(route + "/"));
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const publicPage = isPublicRoute(pathname);
  const compactApp = ["/test", "/simulators/"].some((route) => pathname === route || pathname.startsWith(route));
  if (publicPage) {
    return <div className="tsz-app-shell"><div className="tsz-main-column"><PublicHeader /><main className="tsz-content">{children}</main><footer className="footer"><div className="footer-content">
      <div className="footer-section"><h4>Typing Skill Zone</h4><p>Exam-focused typing practice for government recruitment examinations. Practise, measure and improve.</p></div>
      <div className="footer-section"><h4>Platform</h4><ul><li><a href="/exams">All Exams</a></li><li><a href="/simulators">Exam Simulators</a></li><li><a href="/library">Passage Library</a></li><li><a href="/learn">Learn Typing</a></li></ul></div>
      <div className="footer-section"><h4>Explore</h4><ul><li><a href="/exam-results">Exam Results</a></li><li><a href="/faqs">FAQs</a></li><li><a href="/blog">Blog</a></li><li><a href="/pricing">Pricing</a></li></ul></div>
      <div className="footer-section"><h4>Information</h4><ul><li><a href="/about">About us</a></li><li><a href="/contact">Contact</a></li><li><a href="/terms">Terms</a></li><li><a href="/privacy">Privacy</a></li></ul></div>
    </div><div className="footer-bottom">© {new Date().getFullYear()} Typing Skill Zone. Independent exam preparation platform.</div></footer></div></div>;
  }
  return <div className={compactApp ? "tsz-app-shell tsz-app-shell--compact" : "tsz-app-shell"}><div className="tsz-main-column">
    <header className="app-route-header"><a className="app-route-brand" href="/">Typing Skill Zone</a><nav aria-label="Workspace navigation">{appLinks.map(([href, label]) => <a key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</a>)}</nav></header>
    <main className="tsz-content">{children}</main>
  </div></div>;
}
