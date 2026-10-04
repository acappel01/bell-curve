import {
  FORWARD_CLIENT_IP,
  FORWARD_REQUEST_HEADERS,
  FORWARD_RESPONSE_HEADERS,
  MAX_BODY_BYTES,
  isAllowed,
} from "@/lib/backendProxy";

/**
 * Browser → our origin → backend.
 *
 * The single place browser-side API traffic leaves this app. `lib/api.js`
 * remains the server-side content client and is untouched; this handler exists
 * only so the cart, checkout and quiz clients stop talking to the backend
 * directly, which is what lets the backend start requiring a bearer token they
 * could never safely hold.
 *
 *   browser  fetch("/api/backend/cart")            same-origin, no token
 *   here     GET {API_BASE_URL}/cart               + Authorization: Bearer …
 *
 * The allowlist and the header rules live in `lib/backendProxy.js`; read that
 * first, particularly the note about what this does NOT buy.
 *
 * NEVER CACHED, at any layer. Every route reachable through here is
 * per-visitor: a cart, a lead, publishable gateway credentials that rotate, a
 * protocol preview built from one person's answers. An intermediary caching
 * any of them serves one visitor's data to another. `force-dynamic` covers
 * Next's route cache and `no-store` covers the upstream fetch; the explicit
 * `Cache-Control` on the way out covers everything between us and the browser.
 */
export const dynamic = "force-dynamic";

/**
 * Upstream budget. Without one, undici waits for headers as long as Apache is
 * willing to hold the connection (300s), so a stalled backend would pin a Node
 * request handler per visitor until they gave up — the browser has long since
 * stopped caring. 15s is well beyond the slowest real call (lead creation, which
 * writes a row and its consents) and far short of anything a person waits for.
 */
const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * The visitor's address, taken from the hop in front of us.
 *
 * Apache appends the true peer as the RIGHTMOST entry, so that is the one to
 * trust — entries to its left were supplied by the caller and are worth nothing.
 * Returning a single value rather than the list is deliberate; see
 * FORWARD_CLIENT_IP in lib/backendProxy.js.
 *
 * MEASURED, because the obvious guard was wrong: Next SYNTHESISES this header
 * from the socket peer when none arrives, so it is never absent and a
 * "missing header" check can never fire. A direct hit on 127.0.0.1:3000 yields
 * `x-forwarded-for: 127.0.0.1`, which is indistinguishable from a real header
 * by presence alone. What actually signals "this did not come through Apache"
 * is the resolved address being loopback, so that is what is checked.
 */
const LOOPBACK = /^(::1|::ffff:127\.|127\.)/;

function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (!forwarded) {
    return null;
  }

  const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);

  return parts.length > 0 ? parts[parts.length - 1] : null;
}

/**
 * Read a request body, giving up the moment it exceeds `limit`.
 *
 * Returns null when the cap is passed, so the caller can answer 413 without
 * ever having held more than `limit` bytes.
 */
async function readCapped(request, limit) {
  if (!request.body) {
    return new Uint8Array(0);
  }

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > limit) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return out;
}

/** Upstream base, server-side only. Never `NEXT_PUBLIC_*` — that is the point. */
function upstreamBase() {
  const base = process.env.API_BASE_URL;

  if (typeof base !== "string" || base.trim() === "") {
    return null;
  }

  return base.replace(/\/$/, "");
}

function json(body, status) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Rebuild the upstream path from the catch-all segments.
 *
 * Next has already decoded each segment, so a segment containing `/` or `..`
 * would rejoin into a path that walks somewhere the allowlist never approved.
 * Rejecting here rather than re-encoding keeps one rule — the pattern that
 * matched is the path that is sent.
 */
function upstreamPath(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  if (segments.some((s) => typeof s !== "string" || s === "" || s.includes("/") || s === "." || s === "..")) {
    return null;
  }

  return `/${segments.join("/")}`;
}

async function proxy(request, context) {
  const base = upstreamBase();

  // An unset base means the app is misconfigured, not that the caller did
  // anything wrong — and it must fail closed rather than fall back to a guess.
  if (!base) {
    return json({ message: "API is not configured" }, 503);
  }

  const { path: segments } = await context.params;
  const path = upstreamPath(segments);

  // Next routes HEAD to the GET export, so the method arrives as HEAD and would
  // fail an allowlist keyed on GET. Browsers never send it, but a health check
  // does, and 404ing one is a confusing thing to debug.
  const method = request.method === "HEAD" ? "GET" : request.method;

  if (!path || !isAllowed(method, path)) {
    // 404, not 403: a rejected path should not confirm which paths exist.
    return json({ message: "Not found" }, 404);
  }

  // SET rather than forwarded. Laravel returns a 302 to the admin domain
  // instead of a 422 when this is missing, and a redirect is not something any
  // of these clients can parse — forcing it makes that failure unreachable.
  const headers = new Headers({ Accept: "application/json" });

  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  const ip = clientIp(request);
  if (ip) {
    headers.set(FORWARD_CLIENT_IP, ip);

    // Every lead, consent record and rate-limit bucket upstream keys off this
    // address. A loopback value means the request did not come through the
    // reverse proxy, so the backend would attribute all of them to this server
    // — and nothing would look broken. Say so rather than degrade in silence.
    if (LOOPBACK.test(ip)) {
      console.warn(`[proxy] client address resolved to ${ip}; upstream will see this server as the visitor`);
    }
  }

  // The whole reason this handler exists. Optional so the proxy works against
  // today's still-public endpoints — that is what makes it safe to land on its
  // own, ahead of any backend enforcement.
  if (process.env.API_TOKEN) {
    headers.set("Authorization", `Bearer ${process.env.API_TOKEN}`);
  }

  let body;
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
    // Refuse on the declared length first, so an oversized upload costs nothing
    // to reject. Content-Length is the caller's claim rather than a fact, and a
    // chunked request carries none at all, so it cannot be the only check.
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return json({ message: "Payload too large" }, 413);
    }

    // Read with a RUNNING cap rather than buffering first and measuring after.
    // `arrayBuffer()` would have to accept the whole body before the size could
    // be known: Apache's default LimitRequestBody is 1 GiB, so a handful of
    // concurrent chunked POSTs could exhaust this process's memory and take
    // every route down with it. Aborting mid-stream bounds the cost to the cap.
    const raw = await readCapped(request, MAX_BODY_BYTES);

    if (raw === null) {
      return json({ message: "Payload too large" }, 413);
    }

    // A buffer rather than the request stream: streaming a body onward through
    // undici needs `duplex: "half"`, and nothing here uploads enough to care.
    body = raw.byteLength > 0 ? raw : undefined;
  }

  const url = new URL(`${base}${path}`);
  url.search = new URL(request.url).search;

  let upstream;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      console.error(`[proxy] ${method} ${path} timed out after ${UPSTREAM_TIMEOUT_MS}ms`);
      return json({ message: "Upstream request timed out" }, 504);
    }

    // The backend is unreachable. 502 rather than 500: the fault is upstream,
    // and the clients surface a network-shaped failure differently.
    console.error(`[proxy] ${method} ${path} failed:`, error?.message);
    return json({ message: "Upstream request failed" }, 502);
  }

  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  // Status is passed through verbatim, deliberately: 402 (intake before the
  // card settled), 422 (validation, whose body the forms render inline) and
  // 503 (no merchant account can take payment) are all answers the client
  // branches on. Flattening them to 500 would break each of those paths.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
