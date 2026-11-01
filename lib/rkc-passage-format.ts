/** RKC-referenced passage presentation profiles. These affect layout only, never exam rules or scoring. */
export type RkcPassageLayout = "continuous" | "paragraph-tab" | "source-preserved";

export function getRkcPassageLayout(slug: string): RkcPassageLayout {
  const id = slug.toLowerCase();
  if (/^(bsf-hcm|crpf-hcm)-/.test(id)) return "continuous";
  if (/^(dp-hcm|delhi-police-hcm)-/.test(id)) return "paragraph-tab";
  return "source-preserved";
}

/** Normalize only the visual text shape; do not alter stored passage content. */
export function formatRkcPassage(text: string, layout: RkcPassageLayout | string): string {
  if (layout === "continuous") return text.replace(/\\s+/gu, " ").trim();
  // Keep the source's paragraph and tab boundaries when the RKC-style source has them.
  return text.replace(/\\r\\n?/gu, "\\n").replace(/[ \\t]+\\n/gu, "\\n").trim();
}
