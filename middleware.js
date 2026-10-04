import { NextResponse } from "next/server";
import {
  normalizeCode,
  publicOrigin,
  REF_COOKIE,
  REF_MAX_AGE_SECONDS,
  REF_PARAM,
  UTM_KEYS,
  VISITOR_COOKIE,
} from "@/lib/referral";

/**
 * Referral capture at the edge — the ONLY place that sees a visitor's landing
 * request.
 *
 * THE DEFECT THIS FIXES. Attribution used to be read in `lib/quizClient.js` at
 * quiz-SUBMIT time, from `window.location.search`. A visitor landing on
 * `/?ref=CODE` and clicking anything before submitting had already lost it, and
 * `landing_url` recorded the quiz page rather than the landing page. The checkout
 * lead path sent no attribution at all, so every buyer who skipped the quiz was
 * unattributed — which is precisely the case a commission is owed on.
 *
 * WHY THE CLICK IS RECORDED HERE AND NOT FROM THE PAGE. This runs on our server,
 * so the row is written with the visitor's REAL address — forwarded, and trusted
 * backend-side because TRUSTED_PROXIES names this host — rather than one the
 * caller chose. That is the part that cannot be faked. It does NOT make the
 * ledger unforgeable: the endpoint is anonymous, so anyone can post to it
 * directly with invented visitor ids. Clicks are therefore evidence, not a
 * payable quantity; commissions are paid on conversions, which require a real
 * checkout. See docs/referrals/dev.md.
 *
 * WHY IT AWAITS. A click is money. Fire-and-forget work in middleware may be
 * killed when the response is sent, and a lost click is an unpayable commission,
 * so the POST is awaited under a short timeout. Repeat landings on a code this
 * visitor already carries short-circuit on the cookie before any fetch, so the
 * cost is paid once in the normal case, and a slow or dead backend degrades to
 * "cookie set, click missing" rather than a stalled landing page.
 */
export async function middleware(request) {
  const { searchParams } = request.nextUrl;

  // Normalised by the SAME rule the backend applies, and it REJECTS rather than
  // truncates — see lib/referral.js for why both bounding-then-folding and
  // folding-then-truncating are broken. A code that fails it is treated as no
  // referral at all, so a crafted link costs the visitor nothing.
  const code = normalizeCode(searchParams.get(REF_PARAM));

  if (!code) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const existingCode = request.cookies.get(REF_COOKIE)?.value;
  const existingVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitor || crypto.randomUUID();

  // FIRST TOUCH WINS, matching the backend's write-once attribution. If a
  // visitor arrives under a second affiliate's code before converting, the first
  // one keeps the credit rather than the last one silently stealing it. The
  // arrival is still recorded below, so a last-touch model remains derivable
  // from the ledger if the commercial terms ever call for one.
  const isNewReferral = existingCode !== code;

  if (!existingCode) {
    setCookie(response, REF_COOKIE, code, request);
  }

  if (!existingVisitor) {
    setCookie(response, VISITOR_COOKIE, visitorId, request);
  }

  // Repeat landings on the SAME code cost nothing. A visitor who later arrives
  // under a different code still pays the round trip on each such request — the
  // arrival must be recorded even though first-touch means it will not win the
  // credit, because a last-touch model has to stay derivable from the ledger.
  if (!isNewReferral && existingVisitor) {
    return response;
  }

  await recordClick(request, code, visitorId);

  return response;
}

function setCookie(response, name, value, request) {
  response.cookies.set({
    name,
    value,
    maxAge: REF_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    // Readable by the quiz and checkout forms at submit time — see lib/referral.js
    // for why a marketing code is not treated as a secret.
    httpOnly: false,
    secure: request.nextUrl.protocol === "https:",
    // Deliberately host-only: no explicit `domain`. Scoping to
    // `.atlasprotocol.com` would also hand the code to the admin subdomain,
    // which has no use for it, and would break on localhost.
  });
}

/**
 * Write the click row. Never throws — a landing page must render whatever the
 * backend is doing.
 */
async function recordClick(request, code, visitorId) {
  const base = process.env.API_BASE_URL;

  if (!base) {
    return;
  }

  const { searchParams } = request.nextUrl;
  const utm = {};

  for (const key of UTM_KEYS) {
    const value = searchParams.get(key);

    // Dropped rather than sliced, for the same reason the code is: a cut
    // surrogate pair produces a lone surrogate, which JSON.stringify emits and
    // PHP's json_decode then rejects — losing the whole click, not just the tag.
    if (value && Array.from(value).length <= 255) {
      utm[key] = value;
    }
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (process.env.API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
  }

  // Rightmost entry, exactly as lib/backendProxy.js does it: a visitor may
  // prepend anything they like to X-Forwarded-For, and the true peer is what our
  // own edge appended last. Passing the raw header on would let a visitor write
  // any address into the click ledger.
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",").pop().trim() : null;

  if (clientIp) {
    headers["X-Forwarded-For"] = clientIp;
  }

  const userAgent = request.headers.get("user-agent");

  if (userAgent) {
    headers["User-Agent"] = userAgent;
  }

  try {
    await fetch(`${base}/referrals/clicks`, {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
      body: JSON.stringify({
        code,
        visitor_id: visitorId,
        landing_url: landingUrl(request),
        referrer: request.headers.get("referer")?.slice(0, 2048) || null,
        ...utm,
      }),
    });
  } catch {
    // Swallowed on purpose. The cookie is already set, so the conversion still
    // attributes by code even when the click row was never written.
  }
}

/**
 * The URL the visitor actually landed on.
 *
 * NOT `request.nextUrl.href`: `next start -H 127.0.0.1` makes that
 * `https://localhost:3000/...` whatever the real Host was, so recording it would
 * fill an append-only ledger with addresses nobody ever visited — and, since the
 * click's landing values now win over the form's, would overwrite the correct URL
 * on the lead too. Path and query come from nextUrl; only the origin is wrong.
 */
function landingUrl(request) {
  const origin = publicOrigin(request);
  const pathAndQuery = request.nextUrl.pathname + request.nextUrl.search;

  return (origin ? `${origin}${pathAndQuery}` : pathAndQuery).slice(0, 2048);
}

/**
 * Static assets, the image optimiser and our own API routes can never carry a
 * referral, and middleware on them would cost a function invocation per asset.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
