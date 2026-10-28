export async function POST() { return Response.json({ error: "Legacy sign-up has been disabled. Create an account through Neon Auth at /login." }, { status: 410 }); }
