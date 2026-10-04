/**
 * Where browser-side API calls go.
 *
 * A same-origin path, not a URL, and not an env var. It used to be
 * `NEXT_PUBLIC_API_BASE_URL` pointing straight at the backend, which meant the
 * browser held the only credential it could ever have — none — and the backend
 * had to stay public for the cart, checkout and quiz to work.
 *
 * Everything now goes through `app/api/backend/[...path]/route.js`, which
 * attaches a server-side bearer token the bundle never sees. Three things fall
 * out of that, all of them wanted:
 *
 *   - There is no browser env var left to leak, and none to forget. The old one
 *     was baked in at BUILD time, so an unset value produced
 *     `fetch("undefined/leads")` — resolved as a relative URL against our own
 *     origin, reported as a bare "Failed to fetch", and fixed only by a rebuild.
 *     A constant cannot be unset.
 *   - Requests are same-origin, so CORS stops being involved at all.
 *   - The reachable surface is the proxy's allowlist rather than the whole API.
 *
 * Keep this a path. Making it absolute would reintroduce the cross-origin case
 * and, if it were ever pointed at the backend again, hand the browser back a
 * direct route with no token.
 */
export const API_BASE = "/api/backend";
