import type { Metadata } from "next";
import "./globals.css";
import AuthLink from "@/components/AuthLink";
import AppSidebar from "@/components/AppSidebar";
import GlobalSearch from "@/components/GlobalSearch";
import "./site-polish.css";
import "./desktop-header-fix.css";
import "./design-system.css";
import "./dashboard-home.css";

export const metadata: Metadata = {
  title: "Typing Skill Zone | Exam-focused typing practice",
  description: "Prepare for competitive typing exams with focused English and Hindi practice, exam-configured simulators, a passage library, and individual exam leaderboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="tsz-app-shell">
          <AppSidebar />
          <div className="tsz-main-column">
            <header className="tsz-topbar">
              <div className="topbar-context"><span className="topbar-eyebrow">YOUR LEARNING WORKSPACE</span><strong>Build speed. Build confidence.</strong></div>
              <GlobalSearch />
              <div className="topbar-actions">
                <a href="/dashboard" className="topbar-icon" aria-label="Notifications and recent results" title="Notifications and recent results">♧<i /></a>
                <a href="/pricing" className="topbar-icon topbar-pro" aria-label="Upgrade to Pro" title="Upgrade to Pro">♛</a>
                <a href="/login" className="topbar-icon" aria-label="Settings and account" title="Settings and account">⚙</a>
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
