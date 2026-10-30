export type PassageSlot = "morning" | "afternoon" | "live";
export type PassageLanguage = "en" | "hi";

/** Required daily target: 5 English + 5 Hindi per ordinary slot, 2 + 2 at live-exam time. */
export const PASSAGE_SLOT_TARGETS: Record<PassageSlot, Record<PassageLanguage, number>> = {
  morning: { en: 5, hi: 5 },
  afternoon: { en: 5, hi: 5 },
  live: { en: 2, hi: 2 },
};

export function passageJobs(slot: PassageSlot, existing: Record<PassageLanguage, number> = { en: 0, hi: 0 }) {
  const targets = PASSAGE_SLOT_TARGETS[slot];
  return (["en", "hi"] as const).flatMap((language) =>
    Array.from({ length: Math.max(0, targets[language] - (existing[language] ?? 0)) }, (_, index) => ({
      language,
      index: (existing[language] ?? 0) + index,
    }))
  );
}
