type Slot = "morning" | "afternoon" | "live";
type Lang = "en" | "hi";
const slotCount: Record<Slot, number> = { morning: 5, afternoon: 5, live: 2 };
const istDate = () => new Date(Date.now() + 19_800_000).toISOString().slice(0, 10);
const wordCount = (s: string) => s.trim().split(/\s+/u).filter(Boolean).length;

function languageFor(slot: Slot, index: number): Lang {
  if (slot === "live") return index === 0 ? "en" : "hi";
  return (index + (slot === "afternoon" ? 1 : 0)) % 2 === 0 ? "en" : "hi";
}

async function generateOne(language: Lang, slot: Slot, index: number, apiKey: string, model: string) {
  const languageName = language === "hi" ? "Hindi (natural, grammatically correct Devanagari)" : "English (clear, original Indian competitive-exam prose)";
  const topics = ["public administration and citizen services", "education and skill development", "environment and water conservation", "digital services and cyber awareness", "health, transport and community development", "science, agriculture and rural development"];
  const topic = topics[(index + (slot === "afternoon" ? 2 : slot === "live" ? 4 : 0)) % topics.length];
  const prompt = [
    "Create one original typing-practice passage for an Indian competitive-exam preparation website.",
    "Return only a JSON object with string fields title and body. No markdown fences or commentary.",
    `Language: ${languageName}. Topic: ${topic}.`,
    "The body MUST contain 550 to 750 whitespace-separated words. Count carefully; never return fewer than 500 words.",
    "Use coherent, realistic exam-style prose. Avoid headings, bullets, numbered lists, tables, citations, copied exam passages, repeated sentences, and artificial filler.",
    "For English, use standard Indian English and keyboard-friendly punctuation. For Hindi, use natural Devanagari Hindi and keyboard-friendly punctuation.",
    "The same stored passage must be reusable across all compatible simulators. Do not embed simulator-specific instructions or formatting into the body.",
  ].join("\n");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, temperature: 0.75, max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You write original, high-quality typing passages. Follow exact language and word-count requirements. Output valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Passage provider returned HTTP ${response.status}.`);
  const payload: any = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") throw new Error("Passage provider returned an empty response.");
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Passage provider returned invalid JSON."); }
  const { validatePassage } = await import("@/lib/adminValidation");
  const checked = validatePassage({ title: String(parsed.title ?? ""), language, body: String(parsed.body ?? "") });
  const words = wordCount(checked.clean.body);
  if (!checked.ok) throw new Error(checked.errors.join(" "));
  if (words < 500 || words > 1500) throw new Error(`Generated passage has ${words} words; required range is 500–1500.`);
  return { ...checked.clean, wordCount: words, topic };
}

export async function POST(req: Request) {
  let stage = "checking authorization";
  try {
    const secret = process.env.PASSAGE_CRON_SECRET;
    const supplied = req.headers.get("x-passage-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const cronAuthorized = Boolean(secret && supplied && supplied === secret);

    // Keep authentication out of the route's module-load path. Scheduled calls
    // authenticate with the cron secret and do not need to load the user session stack.
    let uid: string | null = null;
    if (!cronAuthorized) {
      const { requireAdmin } = await import("@/lib/auth");
      uid = await requireAdmin(req);
    }
    if (!uid && !cronAuthorized) {
      return Response.json({ error: "Admin access or scheduled-job authorization required." }, { status: 403 });
    }

    stage = "reading request";
    const body: any = await req.json().catch(() => ({}));
    const slot = body?.slot as Slot;
    if (!["morning", "afternoon", "live"].includes(slot)) {
      return Response.json({ error: "slot must be morning, afternoon, or live." }, { status: 400 });
    }

    stage = "checking AI provider configuration";
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return Response.json({ error: "GROQ_API_KEY is not configured in the Cloudflare Worker secrets." }, { status: 503 });
    // Groq retired llama-3.3-70b-versatile for free/developer accounts on 2026-08-16.
    // Map the old configured value too, because production secrets may still contain it.
    const configuredModel = process.env.GROQ_MODEL?.trim();
    const model = !configuredModel || configuredModel === "llama-3.3-70b-versatile"
      ? "openai/gpt-oss-120b"
      : configuredModel;
    const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : istDate();
    const count = slotCount[slot];

    stage = "loading database client";
    const { sql } = await import("@/lib/db");
    const db = sql();

    stage = "recording generation run";
    const [created] = await db`INSERT INTO passage_generation_runs (generation_date, slot, requested_count, status)
      VALUES (${date}::date, ${slot}, ${count}, 'running')
      ON CONFLICT (generation_date, slot) DO NOTHING
      RETURNING id`;
    if (!created) {
      const [existing] = await db`SELECT id, status, generated_count FROM passage_generation_runs WHERE generation_date = ${date}::date AND slot = ${slot}`;
      if (existing?.status === "completed") return Response.json({ ok: true, alreadyCompleted: true, date, slot, generated: existing.generated_count });
      await db`UPDATE passage_generation_runs SET status = 'running', error_message = NULL, started_at = now() WHERE generation_date = ${date}::date AND slot = ${slot}`;
    }

    stage = "generating passages";
    try {
      const passages = [];
      for (let i = 0; i < count; i++) {
        const language = languageFor(slot, i);
        let result: Awaited<ReturnType<typeof generateOne>> | null = null;
        let lastError = "Generation failed.";
        for (let attempt = 0; attempt < 2 && !result; attempt++) {
          try { result = await generateOne(language, slot, i, apiKey, model); }
          catch (error) { lastError = error instanceof Error ? error.message : "Generation failed."; }
        }
        if (!result) throw new Error(`Passage ${i + 1} (${language}) failed validation after retry: ${lastError}`);
        passages.push({ ...result, language });
      }

      stage = "saving generated passages";
      let saved = 0;
      for (const p of passages) {
        const inserted = await db`INSERT INTO passages (template_id, language, title, body, word_count, source, generation_date, generation_slot, format_metadata)
          VALUES (NULL, ${p.language}, ${p.title}, ${p.body}, ${p.wordCount}, 'scheduled-ai', ${date}::date, ${slot}, ${JSON.stringify({ topic: p.topic, minimumWords: 500, sharedAcrossSimulators: true })}::jsonb)
          ON CONFLICT DO NOTHING RETURNING id`;
        if (inserted.length) saved++;
      }
      await db`UPDATE passage_generation_runs SET status = 'completed', generated_count = ${saved}, completed_at = now(), error_message = NULL
        WHERE generation_date = ${date}::date AND slot = ${slot}`;
      return Response.json({ ok: true, date, slot, generated: saved, wordCounts: passages.map(p => p.wordCount) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error.";
      try {
        await db`UPDATE passage_generation_runs SET status = 'failed', error_message = ${message.slice(0, 500)}, completed_at = now()
          WHERE generation_date = ${date}::date AND slot = ${slot}`;
      } catch (recordError) {
        console.error("[passage-generator] could not record generation failure", recordError);
      }
      console.error("Scheduled passage generation failed:", message);
      return Response.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[passage-generator] route failed", { stage, detail });
    return Response.json({
      error: "Passage generation failed before processing completed.",
      stage,
      code: "PASSAGE_GENERATOR_ROUTE_FAILED",
    }, { status: 500 });
  }
}
