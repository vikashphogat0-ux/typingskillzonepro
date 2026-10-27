import { requireStaff, studentRows } from "@/lib/inst-server";
import { toCsv } from "@/lib/institution";

/** Student progress as a CSV that opens in Excel. */
export async function GET(req: Request) {
  const c = await requireStaff(req);
  if (!c.ok) return c.res;
  const rows = await studentRows(c.m.institution_id);
  const csv = toCsv([["Name", "Email", "Batches", "Tests", "Best net WPM", "Recent accuracy %", "Active days (30)", "Last practice"],
    ...rows.map((r: any) => [r.name, r.email, r.batches, r.tests, r.best_wpm, r.recent_accuracy, r.active_days_30, r.last_active ? new Date(r.last_active).toISOString().slice(0, 10) : ""])]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
