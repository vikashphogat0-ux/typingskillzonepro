import { deleteSession, clearSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  await deleteSession(req.headers.get("cookie"));
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": clearSessionCookie() },
  });
}
