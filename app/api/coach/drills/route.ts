import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { analyzeEvents } from "@/lib/analytics";
import type { KeyEvent } from "@/lib/wpmCalculator";

type Drill = { id: string; title: string; focus: string; instruction: string; text: string; source: "personal" | "starter" };

function wordsFor(source: string, predicate: (word: string) => boolean) {
  const words = source.normalize("NFC").match(/[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu) ?? [];
  const seen = new Set<string>();
  return words.filter(word => {
    const key = word.toLocaleLowerCase();
    if (key.length < 2 || !predicate(key) || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 18);
}

export async function GET(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to generate personal drills." }, { status: 401 });
  const rows = await sql()`SELECT reference_text, keystrokes FROM results
    WHERE user_id = ${uid} AND reference_text IS NOT NULL AND keystrokes IS NOT NULL
    ORDER BY created_at DESC LIMIT 20`;
  const keyStats: Record<string,{attempts:number;errors:number}> = {};
  const pairStats: Record<string,{attempts:number;errors:number}> = {};
  const references: string[] = [];
  for (const row of rows) {
    if (typeof row.reference_text !== "string" || !Array.isArray(row.keystrokes)) continue;
    references.push(row.reference_text);
    try {
      const analysis = analyzeEvents(row.keystrokes as KeyEvent[], row.reference_text);
      for (const [key, stat] of Object.entries(analysis.keys)) {
        keyStats[key] ??= {attempts:0,errors:0};
        keyStats[key].attempts += stat.attempts; keyStats[key].errors += stat.errors;
      }
      for (const pair of Object.values(analysis.weakCombos)) {
        pairStats[pair.pair] ??= {attempts:0,errors:0};
        pairStats[pair.pair].attempts += pair.attempts; pairStats[pair.pair].errors += pair.errors;
      }
    } catch { /* Skip malformed historical logs without blocking drills. */ }
  }
  const rankedKeys = Object.entries(keyStats).filter(([,s])=>s.attempts>=5&&s.errors>0)
    .sort((a,b)=>b[1].errors/b[1].attempts-a[1].errors/a[1].attempts).slice(0,3).map(([key])=>key);
  const rankedPairs = Object.entries(pairStats).filter(([,s])=>s.attempts>=2&&s.errors>0)
    .sort((a,b)=>b[1].errors/b[1].attempts-a[1].errors/a[1].attempts).slice(0,2).map(([pair])=>pair);
  const source = references.join(" ");
  const drills: Drill[] = [];
  for (const key of rankedKeys) {
    const selected = wordsFor(source, word => word.includes(key));
    if (selected.length) drills.push({id:"key-"+encodeURIComponent(key),title:"Key focus: "+key,focus:key,instruction:"Type each word steadily. Prioritise correct first strokes over speed.",text:Array.from({length:3},()=>selected.join(" · ")).join("\n"),source:"personal"});
  }
  for (const pair of rankedPairs) {
    const selected = wordsFor(source, word => word.includes(pair));
    if (selected.length) drills.push({id:"pair-"+encodeURIComponent(pair),title:"Letter transition: "+pair,focus:pair,instruction:"Practise the letter transition inside each word without pausing between the two characters.",text:Array.from({length:3},()=>selected.join(" · ")).join("\n"),source:"personal"});
  }
  const lang = new URL(req.url).searchParams.get("lang") === "hi" ? "hi" : "en";
  if (!drills.length) {
    const starter = lang === "hi"
      ? ["अभ्यास नियमित करने से गति और शुद्धता बेहतर होती है।","सरकारी कार्यालयों में कंप्यूटर का उपयोग तेजी से बढ़ रहा है।","समय का सही प्रबंधन सफलता के लिए आवश्यक है।"]
      : ["steady practice builds accuracy before speed","keep a calm rhythm and focus on each correct keystroke","short daily sessions improve confidence and control"];
    drills.push({id:"starter-"+lang,title:"Foundational rhythm",focus:"accuracy",instruction:"No personal weak pattern is available yet. Complete this starter exercise to build a baseline.",text:starter.join("\n"),source:"starter"});
  }
  return Response.json({drills,personalised:drills.some(d=>d.source==="personal"),attemptsAnalysed:rows.length,weakKeys:rankedKeys,weakPairs:rankedPairs});
}
