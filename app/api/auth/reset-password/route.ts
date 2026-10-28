export async function POST() { return Response.json({ error: "Legacy password recovery has been disabled. Use Neon Auth at /login." }, { status: 410 }); }
