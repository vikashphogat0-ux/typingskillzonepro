import { passageJobs, type PassageSlot, type PassageLanguage } from "@/lib/passageGenerationPlan";

const istDate = () => new Date(Date.now() + 19_800_000).toISOString().slice(0, 10);
const wordCount = (s: string) => s.trim().split(/\s+/u).filter(Boolean).length;

async function generateOne(language: PassageLanguage, slot: PassageSlot, index: number, apiKey: string, model: string, correction?: string) {
  const languageName = language === "hi" ? "Hindi in natural, grammatically correct Devanagari" : "English in clear, original Indian competitive-exam prose";
  const topics = ["public administration and citizen services", "education and skill development", "environment and water conservation", "digital services and cyber awareness", "health, transport and community development", "science, agriculture and rural development"];
  const topic = topics[(index + (slot === "afternoon" ? 2 : slot === "live" ? 4 : 0)) % topics.length];
  const live = slot === "live" ? "This is a special live-exam practice passage: use formal, information-rich continuous prose with realistic examination vocabulary." : "";
  const prompt = [
    "Create one original typing-practice passage for an Indian competitive-exam preparation website.",
    "Return exactly one JSON object with string fields title and body. No markdown fences or commentary.",
    `Language: ${languageName}. Topic: ${topic}. ${live}`,
    "The body must contain 550 to 750 whitespace-separated words. Use coherent exam-style prose, not headings, bullets, lists, tables, citations, copied text, repeated sentences, or filler.",
    "Use keyboard-friendly punctuation. Keep the full passage in the requested language.",
    "Do not include simulator instructions or branding in the passage body.",
    correction ? `CORRECTION REQUIRED: The previous response failed validation: ${correction}. Generate a completely corrected JSON object and verify that title and body are non-empty strings and body is 550-750 words.` : "",
  ].filter(Boolean).join("\n");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, temperature: 0.65, reasoning_effort: "low", reasoning_format: "hidden",
      response_format: { type: "json_object" }, max_completion_tokens: 8192,
      messages: [
        { role: "system", content: "Write original high-quality typing passages. Output one valid JSON object only. No reasoning or markdown." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Passage provider HTTP ${response.status}: ${detail}`);
  }
  const payload: any = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Passage provider returned an empty response.");
  let parsed: any;
  try {
    const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Passage provider returned malformed JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || typeof parsed.title !== "string" || typeof parsed.body !== "string") {
    throw new Error("Passage JSON must contain string title and body fields.");
  }
  const { validatePassage } = await import("@/lib/adminValidation");
  const checked = validatePassage({ title: parsed.title, language, body: parsed.body });
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
    let uid: string | null = null;
    if (!cronAuthorized) {
      const { requireAdmin } = await import("@/lib/auth");
      uid = await requireAdmin(req);
    }
    if (!uid && !cronAuthorized) return Response.json({ error: "Admin access or scheduled-job authorization required." }, { status: 403 });

    stage = "reading request";
    const body: any = await req.json().catch(() => ({}));
    const slot = body?.slot as PassageSlot;
    if (!["morning", "afternoon", "live"].includes(slot)) return Response.json({ error: "slot must be morning, afternoon, or live." }, { status: 400 });

    stage = "checking AI provider configuration";
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return Response.json({ error: "GROQ_API_KEY is not configured in the Cloudflare Worker secrets." }, { status: 503 });
    const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
    const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : istDate();

    stage = "loading database client";
    const { sql } = await import("@/lib/db");
    const db = sql();

    stage = "recording generation run";
    await db`INSERT INTO passage_generation_runs (generation_date, slot, requested_count, status)
      VALUES (${date}::date, ${slot}, ${slot === "live" ? 4 : 10}, 'running')
      ON CONFLICT (generation_date, slot) DO UPDATE SET requested_count = EXCLUDED.requested_count, status = 'running', error_message = NULL, started_at = now()`;

    stage = "checking existing passages";
    const existingRows = await db`SELECT language, count(*)::int AS count FROM passages
      WHERE generation_date = ${date}::date AND generation_slot = ${slot} AND source = 'scheduled-ai'
      GROUP BY language`;
    const existing: Record<PassageLanguage, number> = { en: 0, hi: 0 };
    for (const row of existingRows) {
      if (row.language === "en" || row.language === "hi") {
        const language = row.language as PassageLanguage;
        existing[language] = Number(row.count);
      }
    }
    const jobs = passageJobs(slot, existing);
    const failures: string[] = [];
    let saved = 0;
    const wordCounts: number[] = [];

    stage = "generating and saving individual passages";
    for (const job of jobs) {
      let result: Awaited<ReturnType<typeof generateOne>> | null = null;
      let lastError = "Generation failed.";
      for (let attempt = 0; attempt < 3 && !result; attempt++) {
        try {
          result = await generateOne(job.language, slot, job.index, apiKey, model, attempt ? lastError : undefined);
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Generation failed.";
        }
      }
      if (!result) {
        failures.push(`${job.language} passage ${job.index + 1}: ${lastError}`);
        continue;
      }
      try {
        const inserted = await db`INSERT INTO passages (template_id, language, title, body, word_count, source, generation_date, generation_slot, format_metadata)
          VALUES (NULL, ${job.language}, ${result.title}, ${result.body}, ${result.wordCount}, 'scheduled-ai', ${date}::date, ${slot},
          ${JSON.stringify({ topic: result.topic, minimumWords: 500, sharedAcrossSimulators: true, slotIndex: job.index })}::jsonb)
          ON CONFLICT DO NOTHING RETURNING id`;
        if (inserted.length) {
          saved++;
          wordCounts.push(result.wordCount);
        } else {
          failures.push(`${job.language} passage ${job.index + 1}: insert conflicted; verify existing batch records`);
        }
      } catch (error) {
        failures.push(`${job.language} passage ${job.index + 1}: ${error instanceof Error ? error.message : "database insert failed"}`);
      }
    }

    const finalRows = await db`SELECT language, count(*)::int AS count FROM passages
      WHERE generation_date = ${date}::date AND generation_slot = ${slot} AND source = 'scheduled-ai'
      GROUP BY language`;
    const finalCounts: Record<PassageLanguage, number> = { en: 0, hi: 0 };
    for (const row of finalRows) {
      if (row.language === "en" || row.language === "hi") {
        const language = row.language as PassageLanguage;
        finalCounts[language] = Number(row.count);
      }
    }
    const target = slot === "live" ? 2 : 5;
    const complete = finalCounts.en >= target && finalCounts.hi >= target && failures.length === 0;
    const summary = failures.join(" | ").slice(0, 500) || null;
    await db`UPDATE passage_generation_runs SET status = ${complete ? "completed" : "failed"},
      generated_count = ${finalCounts.en + finalCounts.hi}, error_message = ${summary},
      completed_at = ${complete ? new Date().toISOString() : null}::timestamptz
      WHERE generation_date = ${date}::date AND slot = ${slot}`;

    return Response.json({
      ok: complete, date, slot, generatedThisRun: saved,
      generatedTotal: finalCounts.en + finalCounts.hi,
      targets: { en: target, hi: target }, counts: finalCounts,
      remaining: { en: Math.max(0, target - finalCounts.en), hi: Math.max(0, target - finalCounts.hi) },
      wordCounts, failures,
    }, { status: complete ? 200 : 502 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[passage-generator] route failed", { stage, detail });
    return Response.json({ error: "Passage generation failed before processing completed.", stage, code: "PASSAGE_GENERATOR_ROUTE_FAILED" }, { status: 500 });
  }
}
