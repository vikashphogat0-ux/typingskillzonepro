import { neonAuthUrl } from "@/lib/neon-auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

async function proxy(req: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = neonAuthUrl();
  const incoming = new URL(req.url);
  const target = new URL(`${base}/${path.map(encodeURIComponent).join("/")}`);
  target.search = incoming.search;

  const headers = new Headers();
  for (const key of ["accept", "content-type", "cookie", "origin", "user-agent", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"]) {
    const value = req.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

  const method = req.method.toUpperCase();
  const upstream = await fetch(target, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const key of ["content-type", "cache-control", "location", "set-cookie", "www-authenticate"]) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }
  responseHeaders.set("cache-control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
