export async function POST() { return Response.json({ error: "Legacy password management has been disabled. Use Neon Auth account settings." }, { status: 410 }); }
