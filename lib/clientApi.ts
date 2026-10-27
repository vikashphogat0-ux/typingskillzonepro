export async function api(url: string, init?: RequestInit) {
  try {
    const r = await fetch(url, init);
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: { error: "Network problem. Check your connection and try again." } as any }; }
}
export const post = (url: string, body: unknown) => api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const del = (url: string) => api(url, { method: "DELETE" });
export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
