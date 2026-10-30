import type { Metadata } from "next";
import "./globals.css";
import "./public-site.css";
import PublicHeader from "@/components/PublicHeader";

export const metadata: Metadata = {
 title:"Typing Skill Zone | Exam-focused typing practice",
 description:"English and Hindi typing practice, government exam simulators, passage library and performance analytics."
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><div className="tsz-app-shell"><div className="tsz-main-column"><PublicHeader/><main className="tsz-content">{children}</main><footer className="footer"><div className="footer-content">
 <div className="footer-section"><h4>Typing Skill Zone</h4><p>Exam-focused typing practice for government recruitment examinations. Practise, measure and improve.</p></div>
 <div className="footer-section"><h4>Platform</h4><ul><li><a href="/exams">All Exams</a></li><li><a href="/simulators">Exam Simulators</a></li><li><a href="/library">Passage Library</a></li><li><a href="/learn">Learn Typing</a></li></ul></div>
 <div className="footer-section"><h4>Explore</h4><ul><li><a href="/exam-results">Exam Results</a></li><li><a href="/faqs">FAQs</a></li><li><a href="/blog">Blog</a></li><li><a href="/pricing">Pricing</a></li></ul></div>
 <div className="footer-section"><h4>Information</h4><ul><li><a href="/about">About us</a></li><li><a href="/contact">Contact</a></li><li><a href="/terms">Terms</a></li><li><a href="/privacy">Privacy</a></li></ul></div>
 </div><div className="footer-bottom">© {new Date().getFullYear()} Typing Skill Zone. Independent exam preparation platform.</div></footer></div></div></body></html>
}