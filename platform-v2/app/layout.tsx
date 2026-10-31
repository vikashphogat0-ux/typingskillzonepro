import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TypingSkillZone | Exam-ready typing practice", template: "%s | TypingSkillZone" },
  description: "Examination-specific English and Hindi typing practice, mock tests and performance insights.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
