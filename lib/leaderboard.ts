import { sql } from "./db";

export type Period = "all" | "month" | "week";
export interface Entry { result_id: string; user_id: string; name: string | null; net_wpm: string; accuracy: string; created_at: string; rank: number; total: number }

/**
 * Best valid attempt per student in one simulator. Valid = not flagged and the test ran at least 90% of its time.
 * Ties on speed share a rank and are ordered by accuracy.
 */
export async function leaderboard(opts: { templateId: string; period: Period; institutionId?: string | null; uid?: string | null }): Promise<Entry[]> {
  const days = opts.period === "week" ? 7 : opts.period === "month" ? 30 : 36500;
  const rows = await sql()`
    WITH best AS (
      SELECT DISTINCT ON (r.user_id) r.user_id, r.id AS result_id, r.net_wpm, r.accuracy, r.created_at
      FROM results r JOIN tests t ON t.id = r.test_id
      WHERE r.template_id = ${opts.templateId} AND NOT r.flagged AND r.elapsed_sec >= 0.9 * t.duration_sec
        AND r.created_at >= now() - (${days} * interval '1 day')
        AND (${opts.institutionId ?? null}::uuid IS NULL OR r.user_id IN (SELECT user_id FROM institution_members WHERE institution_id = ${opts.institutionId ?? null}::uuid))
      ORDER BY r.user_id, r.net_wpm DESC, r.accuracy DESC, r.created_at ASC
    ), ranked AS (
      SELECT b.*, u.name, u.show_on_leaderboard,
             RANK() OVER (ORDER BY b.net_wpm DESC, b.accuracy DESC) AS rank, count(*) OVER () AS total
      FROM best b JOIN users u ON u.id = b.user_id
    )
    SELECT result_id, user_id, name, net_wpm, accuracy, created_at, rank::int AS rank, total::int AS total
    FROM ranked WHERE (rank <= 50 AND show_on_leaderboard) OR user_id = ${opts.uid ?? null}::uuid
    ORDER BY rank, created_at`;
  return rows as unknown as Entry[];
}
