const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;");

export async function sendTransactionalEmail(input: { to: string; subject: string; text: string; html?: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!key || !from) throw new Error("Email service is not configured (RESEND_API_KEY and RESEND_FROM_EMAIL are required).");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject.slice(0, 180),
      text: input.text,
      html: input.html ?? `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-line">${escapeHtml(input.text)}</div>`,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`Email provider rejected the message (HTTP ${response.status}): ${detail}`);
  }
  return await response.json().catch(() => ({}));
}
