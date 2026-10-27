import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getStudentAccess } from "@/lib/subscription";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Contact form — no auth required, no pro check
  if (body?.type === "contact") {
    const name    = String(body.name    ?? "").trim().slice(0, 100);
    const email   = String(body.email   ?? "").trim().slice(0, 200);
    const subject = String(body.subject ?? "").trim().slice(0, 200);
    const message = String(body.message ?? "").trim().slice(0, 4000);
    if (!name || !email || !subject || !message)
      return Response.json({ error: "All fields are required." }, { status: 400 });
    await sql()`INSERT INTO contact_messages (name, email, subject, message) VALUES (${name}, ${email}, ${subject}, ${message})`;
    return Response.json({ ok: true });
  }

  // AI feedback — requires auth + Pro
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in to use AI feedback." }, { status: 401 });
  if (!(await getStudentAccess(uid)).limits.aiFeedback) return Response.json({ error: "AI feedback is part of Pro. The coaching notes above are free.", upgrade: true }, { status: 402 });
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "AI feedback is not set up yet. The coaching notes above still apply." }, { status: 503 });
  if (!body?.score) return Response.json({ error: "Missing score." }, { status: 400 });
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 350,
      messages: [
        { role: "system", content: "You are a typing coach for Indian government exam candidates. Give 4 short, concrete tips in plain English based only on the numbers given. No flattery." },
        { role: "user", content: JSON.stringify(body) },
      ],
    }),
  });
  if (!res.ok) return Response.json({ error: "AI feedback failed. Try again later." }, { status: 502 });
  const j = await res.json();
  return Response.json({ text: j.choices?.[0]?.message?.content ?? "" });
}
