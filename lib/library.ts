/** Daily passage and download helpers. Pure functions. */
export const istDate = (now: Date = new Date()) => new Date(now.getTime() + 19800000).toISOString().slice(0, 10); // India date, UTC+5:30

export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Same passage for everyone on a given day and language, different on other days. */
export function dailyPick<T>(items: T[], dateKey: string, lang: string): T | null {
  return items.length ? items[hash(`${dateKey}|${lang}`) % items.length] : null;
}

export function recentDates(n: number, now: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => istDate(new Date(now.getTime() - i * 86400000)));
}

/** Join passages until the text is long enough that nobody can finish before the timer ends. */
export function buildReference(bodies: string[], minChars: number): string {
  const usable = bodies.map((b) => b.trim()).filter(Boolean);
  if (!usable.length) return "";
  let out = "", i = 0;
  while (out.length < minChars && i < 400) { out += (out ? " " : "") + usable[i % usable.length]; i++; }
  return out;
}

/** About 500 characters a minute covers a 100 WPM typist, capped for very long tests. */
export const minCharsFor = (durationSec: number) => Math.min(20000, Math.ceil((durationSec / 60) * 500));

export function fileName(title: string, lang: string, date?: string) {
  const slug = title.normalize("NFKD").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 50) || "passage";
  return `${date ? date + "-" : ""}${lang}-${slug}.txt`;
}

/** UTF-8 with a byte-order mark so Hindi opens correctly in Windows Notepad. */
export const passageFile = (p: { title: string; language: string; body: string }, date?: string) =>
  `\uFEFF${p.title}\r\n${date ? `Date: ${date}\r\n` : ""}Language: ${p.language === "hi" ? "Hindi" : "English"}\r\n\r\n${p.body.replace(/\n/g, "\r\n")}\r\n`;
