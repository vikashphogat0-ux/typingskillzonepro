export type ExamConfig = {
  slug: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  languages: readonly ("English" | "Hindi")[];
  accent: "blue" | "violet" | "cyan" | "amber" | "rose" | "green";
  passagePresentation: "paragraph" | "continuous" | "document" | "configurable";
  rulesStatus: "needs-official-verification";
};

// Exam-specific policy values must be verified against current official notifications
// before timed qualification scoring is enabled. Do not infer official rules here.
export const EXAMS = [
  { slug: "delhi-police-hcm", code: "DP-HCM", name: "Delhi Police Head Constable Ministerial", shortName: "Delhi Police HCM", description: "Dedicated English and Hindi typing practice with an examination-specific workspace.", languages: ["English", "Hindi"], accent: "blue", passagePresentation: "paragraph", rulesStatus: "needs-official-verification" },
  { slug: "bsf-hcm", code: "BSF-HCM", name: "BSF Head Constable Ministerial", shortName: "BSF HCM", description: "A separate practice environment with configurable continuous passage presentation.", languages: ["English", "Hindi"], accent: "green", passagePresentation: "continuous", rulesStatus: "needs-official-verification" },
  { slug: "ssc-cgl", code: "SSC-CGL", name: "SSC CGL", shortName: "SSC CGL", description: "Skill-test preparation workspace and practice archive.", languages: ["English"], accent: "violet", passagePresentation: "configurable", rulesStatus: "needs-official-verification" },
  { slug: "ssc-chsl", code: "SSC-CHSL", name: "SSC CHSL", shortName: "SSC CHSL", description: "Dedicated typing skill-test preparation and mock practice.", languages: ["English"], accent: "amber", passagePresentation: "configurable", rulesStatus: "needs-official-verification" },
  { slug: "railway-rrb", code: "RRB", name: "Railway / RRB", shortName: "Railway / RRB", description: "Railway typing-test practice with its own passage and result history.", languages: ["English", "Hindi"], accent: "cyan", passagePresentation: "configurable", rulesStatus: "needs-official-verification" },
  { slug: "court-typing", code: "COURT", name: "Court Typing Tests", shortName: "Court Typing", description: "Document-oriented typing practice with configurable page presentation.", languages: ["English", "Hindi"], accent: "rose", passagePresentation: "document", rulesStatus: "needs-official-verification" },
] as const satisfies readonly ExamConfig[];

export function getExam(slug: string) {
  return EXAMS.find((exam) => exam.slug === slug);
}
