import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const redirectTo = String(body?.redirectTo ?? "").trim();

  if (!email)
    return Response.json({ error: "Email is required." }, { status: 400 });

  const db = sql();
  const [user] = await db`SELECT id FROM users WHERE lower(email) = ${email} AND password_hash IS NOT NULL`;

  // Always return ok — never reveal whether an account exists
  if (!user) return Response.json({ ok: true });

  // Generate a one-time token
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await db`INSERT INTO reset_tokens (token, user_id) VALUES (${token}, ${user.id})`;

  const base = redirectTo && redirectTo.startsWith("/")
    ? `${process.env.BETTER_AUTH_URL ?? "https://typingskillzone.in"}${redirectTo}`
    : (redirectTo || `${process.env.BETTER_AUTH_URL ?? "https://typingskillzone.in"}/reset-password`);
  const resetUrl = `${base}?token=${token}`;

  const key = process.env.RESEND_API_KEY;
  if (key) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "TypingSkillZone <no-reply@typingskillzone.in>",
        to: email,
        subject: "Reset your TypingSkillZone password",
        html: `<p>Click the link below to reset your password. It expires in 1 hour.</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you did not request a password reset, ignore this email.</p>`,
      }),
    });
  }

  return Response.json({ ok: true });
}
