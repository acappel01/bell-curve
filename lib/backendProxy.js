/**
 * The allowlist behind `app/api/backend/[...path]/route.js`, kept in its own
 * module so it can be reasoned about — and eventually tested — without the
 * route handler's request plumbing around it.
 *
 * WHY THE PROXY EXISTS. Every `/api/v1` route is currently public. Putting the
 * backend behind Sanctum needs a bearer token on each request, and a browser
 * cannot hold a secret: anything shipped in the bundle is readable by whoever
 * receives it. So browser traffic stops going to the backend directly and goes
 * to our own origin instead, where a server-side `API_TOKEN` can be attached
 * out of the client's reach.
 *
 * WHY IT IS AN ALLOWLIST AND NOT A PASSTHROUGH. A proxy that forwards any path
 * while holding a `checkout:*` token is a worse hole than the one being closed:
 * it would hand every authenticated endpoint to the anonymous internet with our
 * credentials attached. Only the exact method + path pairs the browser actually
 * calls are listed here. Adding an entry is a deliberate act — if a new client
 * call 404s through the proxy, that is this list doing its job, not a bug.
 *
 * WHAT IS DELIBERATELY ABSENT. Bare `GET /leads/{uuid}` returns full PII and is
 * fetched server-side only (`lib/api.js`), so it must never appear here — the
 * lead uuid is a bearer credential and the proxy is reachable anonymously. Same
 * for `GET /leads/{uuid}/plan`. Listing either would make the proxy a public
 * PII lookup keyed on a uuid.
 *
 * NOTE THE LIMIT OF WHAT THIS BUYS. Sanctum authenticates the APPLICATION, not
 * the visitor. Anyone can reach these routes through our origin exactly as they
 * can today; the allowlist decides WHAT is reachable, never WHO reaches it. It
 * closes direct scraping of the backend, not lead-uuid exposure — see item 43b
 * in docs/next-session.md before assuming otherwise.
 */

// Cart line ids are integer primary keys — `CartController::updateItem` binds a
// CartItem by route model binding, so nothing else can ever resolve. Digits
// only rather than a loose id: a path segment must not be able to smuggle a
// slash and walk to another endpoint, and the narrowest pattern that still
// matches every real request is the correct one for an allowlist.
const ID = "[0-9]{1,18}";

// Lead identifiers are UUIDs. Matching the real shape rather than a loose id
// keeps the allowlist honest: a request for `/leads/../../admin/intake` cannot
// satisfy this pattern.
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/**
 * Every upstream call made from the browser bundle, and nothing else.
 *
 * Sources, so this can be re-derived rather than trusted:
 *   lib/cartClient.js      — /cart, /cart/items[/:id], /cart/suggestions
 *   lib/checkoutClient.js  — /leads, /leads/:uuid/intake[/complete],
 *                            /checkout/gateway-config, /cart/suggestions
 *   lib/quizClient.js      — /protocol/preview, /leads
 */
const ALLOWED = [
  { method: "GET", path: `^/cart$` },
  { method: "DELETE", path: `^/cart$` },
  { method: "GET", path: `^/cart/suggestions$` },
  { method: "POST", path: `^/cart/items$` },
  { method: "PATCH", path: `^/cart/items/${ID}$` },
  { method: "DELETE", path: `^/cart/items/${ID}$` },

  // Lead creation is called from BOTH the checkout form and the quiz. It must
  // stay open to anonymous visitors — it is the form itself.
  { method: "POST", path: `^/leads$` },

  // The intake payload the embed SDK needs. Carries a PII prefill block, and
  // 402 (payment not settled) is a meaningful status the client branches on.
  { method: "GET", path: `^/leads/${UUID}/intake$` },
  { method: "POST", path: `^/leads/${UUID}/intake/complete$` },

  // Publishable gateway credentials. Never cached — merchant accounts rotate
  // and the account that tokenises must be the account that charges.
  { method: "GET", path: `^/checkout/gateway-config$` },

  // Per-visitor protocol preview. Stores nothing; must never be cached.
  { method: "POST", path: `^/protocol/preview$` },
].map((rule) => ({ ...rule, pattern: new RegExp(rule.path) }));

/**
 * Request headers forwarded upstream, lowercase.
 *
 * An allowlist again, not a blocklist. Forwarding wholesale would pass the
 * visitor's `Cookie` and any `Authorization` they chose to send, letting a
 * caller layer their own credentials onto ours; it would also forward `Host`
 * and break virtual hosting at the backend.
 *
 * `x-cart-token` is the one that matters: cart identity is a ULID the browser
 * holds, and the backend mints a new cart when it is absent. Drop it and every
 * request looks like a new visitor with an empty cart.
 *
 * `user-agent` is forwarded so the lead and consent records keep the visitor's
 * browser rather than Node's — see FORWARD_CLIENT_IP below, which is the same
 * problem for the address.
 *
 * `accept` is deliberately NOT here: it is SET, not forwarded. Laravel decides
 * whether a validation failure is a 422 or a 302 redirect to the admin domain
 * purely on this header, so a caller that omits it gets a redirect the client
 * cannot parse. Forcing it makes that unreachable rather than merely unlikely.
 */
const FORWARD_REQUEST_HEADERS = ["content-type", "x-cart-token", "user-agent"];

/**
 * Response headers passed back to the browser, lowercase.
 *
 * The cart token comes back in the response BODY (`data.token`), not a header,
 * so nothing here is load-bearing for the cart — `x-cart-token` is listed only
 * because the backend may start echoing it and a silently dropped header is a
 * miserable bug to find. Hop-by-hop and encoding headers are deliberately not
 * forwarded: the body has already been decoded by the time we re-emit it, so
 * copying `content-encoding` or `content-length` would describe it wrongly.
 */
const FORWARD_RESPONSE_HEADERS = ["content-type", "x-cart-token"];

/**
 * The visitor's address, carried upstream so the backend can still tell who is
 * asking.
 *
 * WHY THIS IS NOT OPTIONAL. Before the proxy, each browser reached the backend
 * from its own IP. Now every request arrives from this one box, and
 * `$request->ip()` upstream is the server. Three things key off that address
 * and all three quietly become wrong:
 *
 *   - `leads.ip_address` / `user_agent` (LeadController@store)
 *   - `lead_consents.ip_address` / `user_agent` (CreateLeadAction) — this is
 *     the TCPA consent evidence, and "the server agreed to be texted" is not
 *     evidence of anything
 *   - the `api` rate limiter, keyed `by($request->user()?->id ?? $request->ip())`,
 *     which collapses every visitor into ONE 120/min bucket
 *
 * A SINGLE ADDRESS IS SENT, NOT A LIST, and that is the security-relevant part.
 * Apache appends the true peer as the RIGHTMOST entry of the incoming header, so
 * that is the one taken; anything the visitor prepended themselves is dropped
 * here rather than forwarded. A downstream reader that naively takes the first
 * entry therefore still gets the right answer, which a passed-through list would
 * not give it.
 *
 * THE BACKEND HALF IS NOW IN PLACE (2026-09-02). Laravel ignores
 * X-Forwarded-For unless TrustProxies names the peer; the backend's
 * `TRUSTED_PROXIES` now names this host, so the address sent here is the one
 * recorded. Verified end to end: a forged `9.9.9.9` aimed at this proxy is
 * discarded, because the hop in front appends the true peer to the right and
 * only that entry is forwarded.
 *
 * Sending ONE value rather than the chain is what keeps that true regardless of
 * how permissive the upstream trust config is. Note the pairing: if a CDN is
 * ever put in front of this app, the true client is no longer the rightmost
 * entry and this extraction has to change with it.
 */
const FORWARD_CLIENT_IP = "x-forwarded-for";

/**
 * 1 MiB. Comfortably above the largest real payload (a quiz lead with answers
 * and attribution) and far below anything that could be used to push volume
 * through our origin. Nothing here uploads a file.
 */
const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Is this method + path pair one the browser is allowed to reach?
 *
 * `path` is the upstream path WITH a leading slash and WITHOUT any query
 * string — matching on the query as well would mean every new filter needed a
 * new allowlist entry, and the query is forwarded verbatim regardless.
 */
function isAllowed(method, path) {
  return ALLOWED.some((rule) => rule.method === method && rule.pattern.test(path));
}

export {
  ALLOWED,
  FORWARD_CLIENT_IP,
  FORWARD_REQUEST_HEADERS,
  FORWARD_RESPONSE_HEADERS,
  MAX_BODY_BYTES,
  isAllowed,
};
