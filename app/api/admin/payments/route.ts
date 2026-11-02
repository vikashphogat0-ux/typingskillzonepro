import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
const deny = () => Response.json({ error: "Admin access required." }, { status: 403 });
/** Read-only payment ledger. Gateway status is changed only by verified provider events. */
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return deny();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().replace(/[%_]/g, "");
  if (status && !["pending", "paid", "failed", "refunded"].includes(status)) return Response.json({ error: "Invalid payment status." }, { status: 400 });
  const like = "%" + q + "%";
  const rows = await sql()`
    SELECT p.id, p.order_id, p.payment_id, p.amount_paise, p.currency, p.status, p.provider, p.plan_id,
      p.customer_email, p.created_at, p.paid_at, u.email AS user_email, i.name AS institute_name
    FROM payments p LEFT JOIN users u ON u.id = p.user_id LEFT JOIN institutions i ON i.id = p.institute_id
    WHERE (${status} = '' OR p.status = ${status})
      AND (${q} = '' OR p.order_id ILIKE ${like} OR p.payment_id ILIKE ${like}
        OR p.customer_email ILIKE ${like} OR u.email ILIKE ${like} OR i.name ILIKE ${like})
    ORDER BY p.created_at DESC LIMIT 500`;
  return Response.json(rows);
}
