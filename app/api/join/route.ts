import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { addInstituteStudent, getMembership } from "@/lib/inst-server";
import { normalizeJoinCode } from "@/lib/institution";

export async function POST(req: Request) {
  const uid = await getUserId(req);
  if (!uid) return Response.json({ error: "Sign in first, then accept the invitation or enter your institute code." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const db = sql();
  const inviteToken = String(body?.inviteToken ?? "").trim();
  if (inviteToken) {
    if (!/^[a-f0-9]{64}$/i.test(inviteToken)) return Response.json({ error: "This invitation link is invalid." }, { status: 400 });
    const tokenHash = createHash("sha256").update(inviteToken).digest("hex");
    const [invite] = await db`SELECT iv.id, iv.institution_id, iv.email, i.name
      FROM institute_invitations iv JOIN institutions i ON i.id = iv.institution_id
      WHERE iv.token_hash = ${tokenHash} AND iv.accepted_at IS NULL
        AND iv.expires_at > now() AND i.status = 'approved' LIMIT 1`;
    if (!invite) return Response.json({ error: "This invitation has expired, been used, or the institute is unavailable." }, { status: 410 });
    const [user] = await db`SELECT lower(email) AS email FROM users WHERE id = ${uid} LIMIT 1`;
    if (!user?.email || String(user.email).toLowerCase() !== String(invite.email).toLowerCase()) {
      return Response.json({ error: "Sign in with the email address that received this invitation." }, { status: 403 });
    }
    const existing = await getMembership(uid);
    if (existing) {
      if (existing.institution_id === invite.institution_id && existing.role === "student") {
        await db`UPDATE institute_invitations SET accepted_at = now() WHERE id = ${invite.id} AND accepted_at IS NULL`;
        return Response.json({ ok: true, name: invite.name, alreadyMember: true });
      }
      return Response.json({ error: "Your account already belongs to another institute." }, { status: 409 });
    }
    const enrollment = await addInstituteStudent(invite.institution_id, uid);
    if (!enrollment.added) {
      if (!enrollment.hasActivePlan) return Response.json({ error: "This institute does not currently have an active subscription." }, { status: 402 });
      if (enrollment.seatsUsed >= enrollment.seatLimit) return Response.json({ error: "This institute has reached its student seat limit." }, { status: 409 });
      return Response.json({ error: "Your account could not be enrolled. Contact the institute administrator." }, { status: 409 });
    }
    const [accepted] = await db`UPDATE institute_invitations SET accepted_at = now()
      WHERE id = ${invite.id} AND accepted_at IS NULL AND expires_at > now() RETURNING id`;
    if (!accepted) return Response.json({ error: "The invitation was already used. Refresh your institute page." }, { status: 409 });
    return Response.json({ ok: true, name: invite.name });
  }

  const code = normalizeJoinCode(String(body?.code ?? ""));
  if (code.length < 6) return Response.json({ error: "Enter the code your institute gave you." }, { status: 400 });
  if (await getMembership(uid)) return Response.json({ error: "Your account already belongs to an institute." }, { status: 409 });
  const [institute] = await db`SELECT id, name FROM institutions WHERE join_code = ${code} AND status = 'approved'`;
  if (!institute) return Response.json({ error: "That code did not match an active institute." }, { status: 404 });
  const enrollment = await addInstituteStudent(institute.id, uid);
  if (!enrollment.added) {
    if (!enrollment.hasActivePlan) return Response.json({ error: "This institute does not currently have an active subscription. Contact the institute administrator." }, { status: 402 });
    if (enrollment.seatsUsed >= enrollment.seatLimit) return Response.json({ error: "This institute has reached its student seat limit. Contact the institute administrator." }, { status: 409 });
    return Response.json({ error: "Your account already belongs to an institute." }, { status: 409 });
  }
  return Response.json({ ok: true, name: institute.name });
}
