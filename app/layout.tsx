import type { Metadata } from "next";
import "./globals.css";
import AuthLink from "@/components/AuthLink";
import "./site-polish.css";
import "./desktop-header-fix.css";
import "./design-system.css";

export const metadata: Metadata = {
  title: "Typing Skill Zone | Exam-focused typing practice",
  description: "Prepare for competitive typing exams with focused English and Hindi practice, exam-configured simulators, a passage library, and individual exam leaderboards.",
};

const primaryNav = [
  { href: "/", icon: "⌂", label: "Dashboard" },
  { href: "/simulators", icon: "▦", label: "Explore Exams" },
  { href: "/test", icon: "⌨", label: "Practice" },
  { href: "/library", icon: "▤", label: "Passage Library" },
  { href: "/learn", icon: "✦", label: "Learn Typing" },
];
const instituteNav = [{ href: "/institution", icon: "▥", label: "Institute Panel" }];
const accountNav = [
  { href: "/dashboard", icon: "◷", label: "Results & Analytics" },
  { href: "/pricing", icon: "✧", label: "Plans & Billing" },
  { href: "/login", icon: "◎", label: "Account / Sign in" },
];

function NavLinks({ items }: { items: { href: string; icon: string; label: string }[] }) {
  return <>{items.map(item => <a href={item.href} className="sidebar-link" key={item.href}><span className="sidebar-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></a>)}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="tsz-app-shell">
          <aside className="tsz-sidebar">
            <a href="/" className="tsz-brand" aria-label="Typing Skill Zone dashboard">
              <span className="tsz-brand-mark">T</span>
              <span className="tsz-brand-copy"><strong>TypingSkillZone</strong><small>MASTER YOUR NEXT EXAM</small></span>
            </a>
            <div className="sidebar-group-label">WORKSPACE</div>
            <nav className="sidebar-nav" aria-label="Main navigation"><NavLinks items={primaryNav} /></nav>
            <div className="sidebar-group-label">INSTITUTE</div>
            <nav className="sidebar-nav" aria-label="Institute navigation"><NavLinks items={instituteNav} /></nav>
            <div className="sidebar-group-label">ACCOUNT</div>
            <nav className="sidebar-nav" aria-label="Account navigation"><NavLinks items={accountNav} /></nav>
            <a className="sidebar-upgrade" href="/pricing">
              <span className="upgrade-icon">✦</span>
              <strong>Unlock Student Pro</strong>
              <span>More practice. Deeper insights. Better preparation.</span>
              <b>Explore plans <span aria-hidden="true">↗</span></b>
            </a>
            <div className="sidebar-foot"><span className="status-dot" /> All systems ready <span>v2.0</span></div>
          </aside>
          <div className="tsz-main-column">
            <header className="tsz-topbar">
              <div className="topbar-context"><span className="topbar-eyebrow">YOUR LEARNING WORKSPACE</span><strong>Build speed. Build confidence.</strong></div>
              <form className="global-search" action="/library" role="search">
                <span aria-hidden="true">⌕</span>
                <input name="q" type="search" placeholder="Search exams, passages..." aria-label="Search exams and passages" />
                <kbd>Enter</kbd>
              </form>
              <div className="topbar-actions">
                <a href="/dashboard" className="topbar-icon" aria-label="Notifications and recent results" title="Notifications and recent results">♧<i /></a>
                <a href="/dashboard" className="topbar-avatar" aria-label="Open profile and results">TS</a>
                <div className="topbar-auth"><AuthLink /></div>
              </div>
            </header>
            <main className="tsz-content">{children}</main>
            <footer className="footer">
              <div className="footer-content">
                <div className="footer-section"><h4>TypingSkillZone</h4><p className="hint">Independent typing practice platform for Indian government exam preparation.</p></div>
                <div className="footer-section"><h4>Practice</h4><ul><li><a href="/simulators">Exam Simulators</a></li><li><a href="/test">Free Practice</a></li><li><a href="/library">Passage Library</a></li><li><a href="/learn">Touch Typing Course</a></li></ul></div>
                <div className="footer-section"><h4>Account</h4><ul><li><a href="/login">Sign In</a></li><li><a href="/dashboard">My Dashboard</a></li><li><a href="/pricing">Pro Plans</a></li><li><a href="/institution">Institute Panel</a></li></ul></div>
                <div className="footer-section"><h4>Resources</h4><ul><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy">Privacy Policy</a></li><li><a href="/terms">Terms of Service</a></li></ul></div>
              </div>
              <div className="footer-bottom"><p>&copy; {new Date().getFullYear()} TypingSkillZone. Independent preparation platform, not affiliated with any government recruitment body.</p></div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
