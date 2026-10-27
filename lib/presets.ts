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

// Starting points only. Admins can create and edit these in exam_templates.
export const PRESETS: ExamPreset[] = [
  { slug: "ssc-chsl-en", name: "SSC CHSL (English)", lang: "en", durationSec: 600, profileId: "ssc-chsl-en", mode: "highlighted", backspace: "full" },
  { slug: "ssc-chsl-hi", name: "SSC CHSL (Hindi)", lang: "hi", durationSec: 600, profileId: "ssc-chsl-hi", mode: "highlighted", backspace: "full" },
  { slug: "ssc-cgl-dest", name: "SSC CGL (key depressions)", lang: "en", durationSec: 900, profileId: "ssc-cgl-dest", mode: "unhighlighted", backspace: "full" },
  { slug: "rrb-ntpc-en", name: "RRB NTPC (English)", lang: "en", durationSec: 600, profileId: "rrb-ntpc-en", mode: "highlighted", backspace: "full" },
  { slug: "high-court", name: "High Court clerical", lang: "en", durationSec: 600, profileId: "high-court", mode: "offscreen", backspace: "word" },
  { slug: "practice-1", name: "1-minute warm-up", lang: "en", durationSec: 60, profileId: "practice", mode: "highlighted", backspace: "full" },
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
