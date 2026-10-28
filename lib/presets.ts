import type { Lang, ScoringProfile } from "./wpmCalculator";
import type { BackspaceMode } from "./backspacePolicy";

export type DisplayMode = "highlighted" | "unhighlighted" | "offscreen";

export interface ExamPreset {
  slug: string;
  name: string;
  lang: Lang;
  durationSec: number;
  profileId: string;
  mode: DisplayMode;
  backspace: BackspaceMode;
  profile?: ScoringProfile; // set for admin-created templates
}

// Starter catalog mirrors the active rows in db/seed-simulators.sql.
// These are local fallbacks; the database remains the source of truth when configured.
const profile = (id: string, qualifyingWpm?: number, unit: "words" | "keystrokes" = "words"): ScoringProfile => ({
  id, label: id, unit, charsPerWord: 5, fullErrorWeight: 1, halfErrorWeight: 0.5,
  halfRules: { caseOnly: true, punctuationOnly: true }, netMethod: "penalty",
  ...(qualifyingWpm === undefined ? {} : { qualifyingWpm }),
});

export const PRESETS: ExamPreset[] = [
  { slug: "ssc-chsl-en", name: "SSC CHSL — English Typing", lang: "en", durationSec: 600, profileId: "ssc-chsl-en", mode: "highlighted", backspace: "full", profile: profile("ssc-chsl-en", 35) },
  { slug: "ssc-chsl-hi", name: "SSC CHSL — Hindi Typing", lang: "hi", durationSec: 600, profileId: "ssc-chsl-hi", mode: "highlighted", backspace: "full", profile: profile("ssc-chsl-hi", 30) },
  { slug: "ssc-cgl-deo", name: "SSC CGL — DEO (Key Depressions)", lang: "en", durationSec: 900, profileId: "ssc-cgl-deo", mode: "unhighlighted", backspace: "full", profile: profile("ssc-cgl-deo", 26.67, "keystrokes") },
  { slug: "ssc-cgl-ldc-en", name: "SSC CGL — LDC / Tax Assistant (English)", lang: "en", durationSec: 600, profileId: "ssc-cgl-ldc-en", mode: "highlighted", backspace: "full", profile: profile("ssc-cgl-ldc-en", 35) },
  { slug: "rrb-ntpc-en", name: "RRB NTPC — English Typing", lang: "en", durationSec: 600, profileId: "rrb-ntpc-en", mode: "highlighted", backspace: "full", profile: profile("rrb-ntpc-en", 30) },
  { slug: "rrb-ntpc-hi", name: "RRB NTPC — Hindi Typing", lang: "hi", durationSec: 600, profileId: "rrb-ntpc-hi", mode: "highlighted", backspace: "full", profile: profile("rrb-ntpc-hi", 25) },
  { slug: "dp-hcm-en", name: "Delhi Police HCM — English Typing", lang: "en", durationSec: 600, profileId: "dp-hcm-en", mode: "offscreen", backspace: "word", profile: profile("dp-hcm-en", 35) },
  { slug: "dp-hcm-hi", name: "Delhi Police HCM — Hindi Typing", lang: "hi", durationSec: 600, profileId: "dp-hcm-hi", mode: "offscreen", backspace: "word", profile: profile("dp-hcm-hi", 30) },
  { slug: "bsf-hcm-en", name: "BSF Head Constable Min. — English Typing", lang: "en", durationSec: 600, profileId: "bsf-hcm-en", mode: "offscreen", backspace: "word", profile: profile("bsf-hcm-en", 35) },
  { slug: "bsf-hcm-hi", name: "BSF Head Constable Min. — Hindi Typing", lang: "hi", durationSec: 600, profileId: "bsf-hcm-hi", mode: "offscreen", backspace: "word", profile: profile("bsf-hcm-hi", 30) },
  { slug: "crpf-hcm-en", name: "CRPF Head Constable Min. — English Typing", lang: "en", durationSec: 600, profileId: "crpf-hcm-en", mode: "offscreen", backspace: "word", profile: profile("crpf-hcm-en", 35) },
  { slug: "cisf-hcm-en", name: "CISF Head Constable Min. — English Typing", lang: "en", durationSec: 600, profileId: "cisf-hcm-en", mode: "offscreen", backspace: "word", profile: profile("cisf-hcm-en", 35) },
  { slug: "dsssb-ldc-en", name: "DSSSB — LDC English Typing", lang: "en", durationSec: 600, profileId: "dsssb-ldc-en", mode: "highlighted", backspace: "full", profile: profile("dsssb-ldc-en", 35) },
  { slug: "dsssb-ldc-hi", name: "DSSSB — LDC Hindi Typing", lang: "hi", durationSec: 600, profileId: "dsssb-ldc-hi", mode: "highlighted", backspace: "full", profile: profile("dsssb-ldc-hi", 30) },
  { slug: "hc-clerk-en", name: "High Court Clerk — English Typing", lang: "en", durationSec: 600, profileId: "hc-clerk-en", mode: "offscreen", backspace: "word", profile: profile("hc-clerk-en", 30) },
  { slug: "hc-clerk-hi", name: "High Court Clerk — Hindi Typing", lang: "hi", durationSec: 600, profileId: "hc-clerk-hi", mode: "offscreen", backspace: "word", profile: profile("hc-clerk-hi", 25) },
  { slug: "district-court-en", name: "District Court Clerk — English Typing", lang: "en", durationSec: 600, profileId: "district-court-en", mode: "offscreen", backspace: "word", profile: profile("district-court-en", 35) },
  { slug: "district-court-hi", name: "District Court Clerk — Hindi Typing", lang: "hi", durationSec: 600, profileId: "district-court-hi", mode: "offscreen", backspace: "word", profile: profile("district-court-hi", 30) },
  { slug: "upssc-ldc-hi", name: "UPSSC / UP Courts — Hindi Typing", lang: "hi", durationSec: 600, profileId: "upssc-ldc-hi", mode: "offscreen", backspace: "word", profile: profile("upssc-ldc-hi", 25) },
  { slug: "upsssc-hi", name: "UPSSSC — Hindi Typing", lang: "hi", durationSec: 600, profileId: "upsssc-hi", mode: "highlighted", backspace: "full", profile: profile("upsssc-hi", 25) },
  { slug: "rsmssb-ldc-hi", name: "RSMSSB — Rajasthan LDC Hindi Typing", lang: "hi", durationSec: 600, profileId: "rsmssb-ldc-hi", mode: "highlighted", backspace: "full", profile: profile("rsmssb-ldc-hi", 35) },
  { slug: "rsmssb-ldc-en", name: "RSMSSB — Rajasthan LDC English Typing", lang: "en", durationSec: 600, profileId: "rsmssb-ldc-en", mode: "highlighted", backspace: "full", profile: profile("rsmssb-ldc-en", 35) },
  { slug: "ibps-dest", name: "IBPS DEST — Data Entry Speed Test", lang: "en", durationSec: 300, profileId: "ibps-dest", mode: "unhighlighted", backspace: "full", profile: profile("ibps-dest", 26.67, "keystrokes") },
  { slug: "practice-1min", name: "Free Practice — 1 Minute", lang: "en", durationSec: 60, profileId: "practice", mode: "highlighted", backspace: "full", profile: profile("practice") },
  { slug: "practice-5min-hi", name: "Free Practice — 5 Minutes (Hindi)", lang: "hi", durationSec: 300, profileId: "practice", mode: "highlighted", backspace: "full", profile: profile("practice") },
];

export const SAMPLE_PASSAGES: Record<Lang, string[]> = {
  en: [
    "Digital India has changed the way citizens interact with the government. Online services now save time, reduce paperwork and bring transparency to many public offices across the country. A good typist keeps a steady rhythm and does not rush, because small mistakes cost marks in the final result.",
    "Clean water, good roads and reliable electricity are basic needs of every community. Public officers must work together with local people to solve problems and improve daily life in towns and villages. Regular practice builds speed, accuracy and confidence for any competitive examination.",
  ],
  hi: [
    "नियमित अभ्यास से टंकण की गति और शुद्धता दोनों बढ़ती हैं। परीक्षा में सफलता पाने के लिए धैर्य और लगन के साथ प्रतिदिन परिश्रम करना बहुत आवश्यक है। सरकारी कार्यालयों में कंप्यूटर का उपयोग तेज़ी से बढ़ रहा है।",
    "शिक्षा ही समाज को आगे बढ़ाने का सबसे मज़बूत साधन है। जब हर बच्चा विद्यालय जाएगा तभी देश का भविष्य उज्ज्वल और सुरक्षित बन सकेगा। भारत की संस्कृति और परंपराएँ पूरे विश्व में अपनी अलग पहचान रखती हैं।",
  ],
};
