import type { Metadata } from "next";
import "./globals.css";
import "./public-site.css";
import "./charcoal-v2.css";
import SiteShell from "@/components/SiteShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://typingskillzone.in"),
  title: "Typing Skill Zone | Exam-focused typing practice",
  description: "English and Hindi typing practice, government exam simulators, passage library and performance analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><SiteShell>{children}</SiteShell></body></html>;
}
