/** Touch-typing course data and helpers (QWERTY, US layout). Pure functions, no DOM. */

export const FINGERS: { name: string; chars: string; color: string }[] = [
  { name: "Left pinky", chars: "1qaz", color: "#e9a8b4" },
  { name: "Left ring", chars: "2wsx", color: "#f2c18d" },
  { name: "Left middle", chars: "3edc", color: "#e8d77a" },
  { name: "Left index", chars: "45rfvtgb", color: "#9fd6a5" },
  { name: "Right index", chars: "67yhnujm", color: "#8fd0d8" },
  { name: "Right middle", chars: "8ik,", color: "#a9bff0" },
  { name: "Right ring", chars: "9ol.", color: "#c9b2ee" },
  { name: "Right pinky", chars: "0p;/-=[]'", color: "#eeaad8" },
  { name: "Thumb", chars: " ", color: "#cfd6e2" },
];

export const KB_ROWS = ["1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"];

const SHIFTED = '!@#$%^&*()_+{}:"<>?';
const UNSHIFTED = "1234567890-=[];',./";
const SHIFT_MAP: Record<string, string> = {
  "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
  "_": "-", "+": "=", "{": "[", "}": "]", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/",
};

export const needsShift = (ch: string) => ch in SHIFT_MAP || (ch.length === 1 && ch !== ch.toLowerCase());
export const baseKey = (ch: string) => SHIFT_MAP[ch] ?? ch.toLowerCase();
export function fingerFor(ch: string) {
  const k = baseKey(ch);
  return FINGERS.find((f) => f.chars.includes(k)) ?? null;
}

export interface Lesson { id: string; title: string; keys: string; tip: string }
export interface Track { id: string; title: string; lessons: Lesson[] }

export const TRACKS: Track[] = [
  { id: "home", title: "Home row", lessons: [
    { id: "home-1", title: "F and J", keys: "fj", tip: "Rest your index fingers on F and J. Feel the small bumps." },
    { id: "home-2", title: "D and K", keys: "fjdk", tip: "Middle fingers reach D and K. Keep other fingers on the home row." },
    { id: "home-3", title: "S and L", keys: "fjdksl", tip: "Ring fingers press S and L." },
    { id: "home-4", title: "A and ;", keys: "fjdksla;", tip: "Pinkies are weak. Press gently and return to the home row." },
    { id: "home-5", title: "G and H", keys: "asdfghjkl;", tip: "Index fingers stretch one key inward to G and H." },
  ] },
  { id: "upper", title: "Upper row", lessons: [
    { id: "up-1", title: "R and U", keys: "asdfjkl;ru", tip: "Index fingers go up. Return to F and J after each press." },
    { id: "up-2", title: "E and I", keys: "asdfjkl;ruei", tip: "Middle fingers reach up to E and I." },
    { id: "up-3", title: "W and O", keys: "asdfjkl;ruei wo".replace(" ", ""), tip: "Ring fingers reach W and O." },
    { id: "up-4", title: "Q and P", keys: "asdfjkl;ruewoiqp", tip: "Pinkies reach Q and P. Keep your wrist still." },
    { id: "up-5", title: "T and Y", keys: "asdfghjklqwertyuiop", tip: "Index fingers stretch to T and Y." },
  ] },
  { id: "lower", title: "Lower row", lessons: [
    { id: "low-1", title: "V and M", keys: "asdfjkl;vm", tip: "Index fingers curl down to V and M." },
    { id: "low-2", title: "C and comma", keys: "asdfjkl;vmc,", tip: "Middle fingers reach C and comma." },
    { id: "low-3", title: "X and full stop", keys: "asdfjkl;vmc,x.", tip: "Ring fingers reach X and the full stop." },
    { id: "low-4", title: "Z and slash", keys: "asdfjkl;vmc,x.z/", tip: "Pinkies reach Z and slash." },
    { id: "low-5", title: "B and N", keys: "asdfghjklzxcvbnm", tip: "Index fingers stretch to B and N." },
  ] },
  { id: "numbers", title: "Numbers and symbols", lessons: [
    { id: "num-1", title: "1 2 3 4 5", keys: "12345", tip: "Left hand: pinky 1, ring 2, middle 3, index 4 and 5." },
    { id: "num-2", title: "6 7 8 9 0", keys: "67890", tip: "Right hand: index 6 and 7, middle 8, ring 9, pinky 0." },
    { id: "num-3", title: "Punctuation", keys: "-=[];',./", tip: "Right pinky handles most punctuation. Go slowly." },
    { id: "num-4", title: "Shift symbols", keys: "!@#$%", tip: "Hold the Shift key on the opposite hand to the key you press." },
  ] },
];

export const ALL_LESSONS = TRACKS.flatMap((t) => t.lessons);

/** Build a drill of short groups drawn only from the lesson's keys, e.g. "fj jf jjf kd". */
export function buildDrill(keys: string, length = 60, rng: () => number = Math.random): string {
  const pool = Array.from(keys);
  let out = "";
  while (out.length < length) {
    const n = 2 + Math.floor(rng() * 3);
    let g = "";
    for (let i = 0; i < n; i++) g += pool[Math.floor(rng() * pool.length)];
    out += (out ? " " : "") + g;
  }
  return out.slice(0, length).trim();
}

export const PASS_ACCURACY = 90;
export { SHIFTED, UNSHIFTED };
