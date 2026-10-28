export async function POST() { return Response.json({ error: "Legacy sign-in has been disabled. Use Neon Auth at /login." }, { status: 410 }); }
