import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return Response.json({ error: "Admin access required." }, { status: 403 });
  const db = sql();
  const [s] = await db`
    SELECT
      (SELECT count(*)::int FROM users) AS total_users,
      (SELECT count(*)::int FROM users WHERE created_at > now() - interval '7 days') AS new_users_week,
      (SELECT count(DISTINCT user_id)::int FROM results WHERE created_at > now() - interval '7 days') AS active_users_week,
      (SELECT count(*)::int FROM institutions WHERE status = 'approved') AS institutions,
      (SELECT count(*)::int FROM exam_templates WHERE is_active) AS active_exams,
      (SELECT count(*)::int FROM passages) AS passages,
      (SELECT count(*)::int FROM results) AS total_tests,
      (SELECT count(*)::int FROM results WHERE created_at > now() - interval '7 days') AS tests_week,
      (SELECT count(*)::int FROM subscriptions WHERE plan = 'pro' AND status = 'active' AND ends_at > now()) AS active_pro,
      (SELECT count(*)::int FROM institutions WHERE status = 'pending') AS pending_institutions`;
  return Response.json(s);
}
