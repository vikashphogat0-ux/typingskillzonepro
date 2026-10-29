import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getNeonIdentity, getOrCreateAppUser } from "@/lib/neon-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie" },
  });
}

export async function GET(req: Request) {
  try {
    const identity = await getNeonIdentity(req);
    if (!identity) return privateJson({ error: "Sign in required." }, 401);
    const uid = await getOrCreateAppUser(identity);
    const [user] = await sql()`SELECT id, name, email, created_at FROM users WHERE id = ${uid}`;
    if (!user) return privateJson({ error: "User not found." }, 404);
    return privateJson({ ...user, name: user.name ?? identity.name });
  } catch (error) {
    console.error("Unable to resolve current Neon Auth session:", error);
    return privateJson({ error: "Account status is temporarily unavailable." }, 503);
  }
}

export async function POST(req: Request) {
  try {
    const uid = await getUserId(req);
    if (!uid) return privateJson({ error: "Sign in required." }, 401);
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    if (name.length < 1 || name.length > 100)
      return privateJson({ error: "Name must be 1–100 characters." }, 400);
    await sql()`UPDATE users SET name = ${name} WHERE id = ${uid}`;
    return privateJson({ ok: true });
  } catch (error) {
    console.error("Unable to update current user profile:", error);
    return privateJson({ error: "Profile update is temporarily unavailable." }, 503);
  }
}
