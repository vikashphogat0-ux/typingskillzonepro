export async function POST() { return Response.json({ error: "Legacy sessions have been disabled. Sign out through Neon Auth." }, { status: 410 }); }
