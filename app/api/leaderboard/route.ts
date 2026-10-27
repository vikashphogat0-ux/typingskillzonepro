import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getMembership } from "@/lib/inst-server";
import { leaderboard, type Period } from "@/lib/leaderboard";

/** ?simulator=slug&period=all|month|week&scope=all|institute. Every simulator has its own board. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = u.searchParams.get("simulator") ?? "";
  const period = (["all", "month", "week"].includes(u.searchParams.get("period") ?? "") ? u.searchParams.get("period") : "all") as Period;
  const [t] = await sql()`SELECT id, name FROM exam_templates WHERE slug = ${slug} AND is_active`;
  if (!t) return Response.json({ error: "Simulator not found." }, { status: 404 });
  const uid = await getUserId(req).catch(() => null);
  let institutionId: string | null = null;
  if (u.searchParams.get("scope") === "institute") {
    const m = uid ? await getMembership(uid) : null;
    if (!m) return Response.json({ error: "Join an institute to see its board." }, { status: 403 });
    institutionId = m.institution_id;
  }
  const entries = await leaderboard({ templateId: t.id, period, institutionId, uid });
  return Response.json({ simulator: t.name, me: uid, entries });
}
