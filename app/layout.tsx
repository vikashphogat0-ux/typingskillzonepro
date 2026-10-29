import type { Metadata } from "next";
import "./globals.css";
import AuthLink from "@/components/AuthLink";
import "./site-polish.css";
import "./desktop-header-fix.css";

export const metadata: Metadata = {
  title: "Typing Skill Zone | Exam-focused typing practice",
  description: "Prepare for competitive typing exams with focused English and Hindi practice, exam-configured simulators, a passage library, and individual exam leaderboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <a href="/" className="brand">TypingSkillZone</a>
          <nav>
            <a href="/" className="nav-home-link" aria-label="Return to TypingSkillZone home"><span aria-hidden="true">⌂</span> Home</a>
            <a href="/simulators">Explore Exams</a>
            <a href="/test">Practice</a>
            <a href="/library">Library</a>
            <a href="/learn">Learn</a>
            <a href="/institution">Institute</a>
            <a href="/dashboard">Results</a>
            <a href="/pricing">Pro</a>
            <AuthLink />
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>TypingSkillZone</h4>
              <p className="hint">Independent typing practice platform for Indian government exam preparation.</p>
            </div>
            <div className="footer-section">
              <h4>Practice</h4>
              <ul>
                <li><a href="/simulators">Exam Simulators</a></li>
                <li><a href="/test">Free Practice</a></li>
                <li><a href="/library">Passage Library</a></li>
                <li><a href="/learn">Touch Typing Course</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Account</h4>
              <ul>
                <li><a href="/login">Sign In</a></li>
                <li><a href="/dashboard">My Dashboard</a></li>
                <li><a href="/pricing">Pro Plans</a></li>
                <li><a href="/institution">Institute Panel</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} TypingSkillZone. Independent preparation platform, not affiliated with any government recruitment body.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}