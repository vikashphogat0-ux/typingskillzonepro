import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { addInstituteStudent, getMembership } from "@/lib/inst-server";
import { normalizeJoinCode } from "@/lib/institution";

/** A student joins an approved institute with its join code. */
export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in first, then enter the code." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const code = normalizeJoinCode(String(b?.code ?? ""));
  if (code.length < 6) return Response.json({ error: "Enter the code your institute gave you." }, { status: 400 });
  if (await getMembership(uid)) return Response.json({ error: "Your account already belongs to an institute." }, { status: 409 });
  const [i] = await sql()`SELECT id, name FROM institutions WHERE join_code = ${code} AND status = 'approved'`;
  if (!i) return Response.json({ error: "That code did not match an active institute." }, { status: 404 });
  const enrollment = await addInstituteStudent(i.id, uid);
  if (!enrollment.added) {
    if (!enrollment.hasActivePlan) return Response.json({ error: "This institute does not currently have an active subscription. Contact the institute administrator." }, { status: 402 });
    if (enrollment.seatsUsed >= enrollment.seatLimit) return Response.json({ error: "This institute has reached its student seat limit. Contact the institute administrator." }, { status: 409 });
    return Response.json({ error: "Your account already belongs to an institute." }, { status: 409 });
  }
  return Response.json({ ok: true, name: i.name });
}
