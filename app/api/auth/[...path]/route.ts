import { neonAuthUrl } from "@/lib/neon-auth";

export const dynamic = "force-dynamic";

async function proxy(req: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const incoming = new URL(req.url);
  const target = new URL(`${neonAuthUrl()}/${path.map(encodeURIComponent).join("/")}`);
  target.search = incoming.search;
  const headers = new Headers();
  for (const key of ["accept", "content-type", "cookie", "origin", "user-agent"]) {
    const value = req.headers.get(key);
    if (value) headers.set(key, value);
  }

  // Do not forward the application's x-forwarded-host/proto to Neon Auth.
  // The upstream managed Auth endpoint must validate its own request hostname;
  // the browser Origin is preserved above for Neon Auth's trusted-domain checks.
  const method = req.method.toUpperCase();
  const upstream = await fetch(target, {
    method, headers,
    body: method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "manual", cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const key of ["content-type", "cache-control", "location", "www-authenticate"]) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }

  // Preserve every Set-Cookie independently. Collapsing multiple cookies into
  // one comma-separated header can corrupt session cookies and Expires dates.
  const headersWithCookieSupport = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = headersWithCookieSupport.getSetCookie?.();
  if (cookies?.length) {
    for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);
  } else {
    const cookie = upstream.headers.get("set-cookie");
    if (cookie) {
      // Some runtimes expose combined Set-Cookie values instead of getSetCookie().
      // Split only at a comma that begins the next cookie name=value pair; this
      // avoids splitting the comma inside an Expires date.
      for (const value of cookie.split(/,(?=\\s*[^;,\\s]+=)/)) responseHeaders.append("set-cookie", value.trim());
    }
  }

  responseHeaders.set("cache-control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
