/**
 * Referral capture — the names and shapes shared by the edge middleware (which
 * writes the cookies) and the browser clients (which read them back at
 * conversion).
 *
 * WHY COOKIES AND NOT localStorage, where the cart token lives: the capture has
 * to happen at LANDING, before any React has run, or the code is lost the moment
 * the visitor clicks an internal link — `next/link` navigation does not carry
 * query params. Only middleware sees that first request, and middleware can set
 * a cookie and cannot touch localStorage.
 *
 * These cookies are deliberately NOT httpOnly. A referral code is a marketing
 * identifier printed on flyers, not a secret, and the quiz and checkout forms
 * both need to read it from the browser at submit time.
 *
 * Nothing here is a security boundary, and the click ledger is not one either:
 * its endpoint is anonymous, so clicks are EVIDENCE rather than a payable
 * quantity. Commissions are paid on conversions, which require a real checkout.
 */

/** The referral code the visitor arrived with. */
export const REF_COOKIE = "atlas_ref";

/** Stable per-browser id. Makes a unique click derivable; identifies nobody. */
export const VISITOR_COOKIE = "atlas_vid";

/**
 * 30 days. Long enough for a considered purchase in this category, short enough
 * that a code cannot still be earning a year after the campaign ended. If this
 * ever changes, it is a commercial decision about attribution windows, not a
 * technical one — the affiliate agreement should say the same number.
 */
export const REF_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Query param an affiliate link carries. */
export const REF_PARAM = "ref";

/** The utm keys captured alongside a referral, in the backend's own order. */
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

/**
 * Read a cookie in the browser. Returns null during any server render, so
 * callers can use it unguarded.
 */
export function readCookie(name) {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    // A malformed cookie value (hand-edited, or written by something else under
    // the same name) must not throw here — this runs inside the checkout submit
    // path, and an unreadable referral may not cost a sale.
    return null;
  }
}

/**
 * The referral fields to send with a lead, or `{}` when this visitor carries no
 * referral.
 *
 * Spread into a lead payload. Returning an empty object rather than nulls keeps
 * an unreferred lead's request body identical to what it was before referrals
 * existed, so nothing downstream has to distinguish "no referral" from "referral
 * explicitly absent".
 */
export function referralFields() {
  const code = readCookie(REF_COOKIE);

  if (!code) {
    return {};
  }

  const visitorId = readCookie(VISITOR_COOKIE);

  return {
    referral_code: code,
    ...(visitorId ? { referral_visitor_id: visitorId } : {}),
  };
}

/**
 * The single normalisation for a referral code on this side — the exact mirror of
 * the backend's `ReferralLink::normalizeCode()`, and it must stay that way.
 *
 * Lowercase, then REJECT anything too long. It deliberately does not truncate:
 *
 *  - Unicode case-folding can LENGTHEN a string (`İ` U+0130 becomes `i` + U+0307),
 *    so bounding before folding let a 64-character code become 128 and 422 every
 *    later lead submit for as long as the cookie lived.
 *  - Truncating AFTERWARDS is no better, because JavaScript string indexes are
 *    UTF-16 units: slicing mid-surrogate-pair leaves a lone surrogate, and
 *    `encodeURIComponent` throws `URIError` on one — a 500 on the landing page.
 *
 * A code that cannot survive both is not a real code, so it is dropped and the
 * visitor is simply unreferred. Length is measured in CODE POINTS, matching PHP's
 * `mb_strlen`.
 */
export function normalizeCode(value) {
  const code = String(value ?? "").trim().toLowerCase();

  if (code === "" || Array.from(code).length > 64) {
    return null;
  }

  return code;
}

/**
 * The public origin this site is served on.
 *
 * `request.nextUrl.href` CANNOT be used for this. `next start -H 127.0.0.1` makes
 * the middleware's own URL `https://localhost:3000/...` regardless of the real
 * Host — Next builds it from the bind address and then rewrites loopback hosts to
 * `localhost`. Recording that as a landing URL would fill the click ledger with
 * addresses no visitor ever saw, permanently, since the ledger is append-only.
 *
 * `SITE_URL` is already this deployment's declared public origin; the forwarded
 * host is the fallback for any environment that has not set it.
 */
export function publicOrigin(request) {
  const configured = process.env.SITE_URL;

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!host) {
    return null;
  }

  const proto = request.headers.get("x-forwarded-proto") || "https";

  return `${proto}://${host}`;
}
