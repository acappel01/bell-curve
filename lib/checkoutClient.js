/**
 * Browser-side checkout API client. Lead creation is paired to the cart
 * session by the X-Cart-Token header — the backend captures it as
 * leads.cart_ulid so /api/v1/checkout can verify the cart and lead came
 * from the same visitor.
 *
 * Calls go through this app's own proxy rather than straight to the backend,
 * so the bearer token stays server-side — see `lib/browserBase.js`.
 */
import { getCartToken } from "./cartClient";
import { API_BASE } from "./browserBase";

const base = () => API_BASE;

function cartTokenHeader() {
  const token = getCartToken();
  return token ? { "X-Cart-Token": token } : {};
}

/**
 * Create a lead from the checkout form. Returns the lead payload.
 *
 * It also carries `handoff_url`, which this app deliberately IGNORES: the
 * clinical intake is hosted here at /checkout/intake/{uuid}, not on the admin
 * domain. This app owns its URLs.
 *
 * On a 422 the thrown Error carries `errors` — a field → messages map
 * straight from the Laravel validation envelope — for inline display.
 */
export async function createLead(payload) {
  const response = await fetch(`${base()}/leads`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...cartTokenHeader(),
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.message || `Checkout request failed (${response.status})`);
    error.errors = body?.errors ?? {};
    throw error;
  }

  return body?.data ?? null;
}

/**
 * Everything needed to host the clinical intake embed on this site: embed
 * config, cart summary, and who is collecting payment.
 *
 * The lead UUID is the credential, exactly as it is for the plan page. This is
 * fetched client-side rather than server-side on purpose — the embed SDK runs
 * in the browser and needs the same payload, so a server fetch would only have
 * to be serialised straight back down.
 */
export async function fetchLeadIntake(uuid) {
  const response = await fetch(`${base()}/leads/${encodeURIComponent(uuid)}/intake`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not load the clinical intake (${response.status}).`);
  }

  const body = await response.json().catch(() => null);

  return body?.data ?? null;
}

/**
 * Which gateway this checkout should tokenise against, and the publishable
 * credentials to do it with.
 *
 * NEVER CACHED. Merchant accounts rotate as they approach their processing
 * limits, and the account that tokenises must be the account that charges — an
 * opaque token is worthless at any other gateway. A cached context would hand
 * the browser a stale account and the charge would fail at submit.
 *
 * A 503 here means no account can currently take the payment, which is a real
 * answer: the caller should say payment is unavailable rather than render a
 * card form that cannot work.
 */
export async function fetchGatewayConfig() {
  const response = await fetch(`${base()}/checkout/gateway-config`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = new Error("Payment is temporarily unavailable. Please try again shortly.");
    error.status = response.status;
    throw error;
  }

  const body = await response.json().catch(() => null);

  return body?.data ?? null;
}

/**
 * Advisory "the visitor appears to have submitted" ping from the embed's
 * onComplete, so the page can show a thank-you state without waiting on the
 * webhook.
 *
 * NOT AUTHORITATIVE and deliberately best-effort: the signed webhook is the
 * source of truth for status and fulfilment. A failure here must never block
 * the UI, so it resolves rather than throws.
 */
export async function markIntakeComplete(uuid, { encounterId = null, patientId = null } = {}) {
  try {
    await fetch(`${base()}/leads/${encodeURIComponent(uuid)}/intake/complete`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ encounter_id: encounterId, patient_id: patientId }),
    });
  } catch {
    // Swallowed on purpose — the webhook still lands.
  }
}

/**
 * Upsell suggestions for the current cart (admin-curated Pairs With /
 * Related catalog relations). Empty when upsells are disabled in the
 * backend billing settings, so callers can simply hide the placement.
 */
export async function fetchCartSuggestions() {
  const response = await fetch(`${base()}/cart/suggestions`, {
    headers: { Accept: "application/json", ...cartTokenHeader() },
  });

  if (!response.ok) {
    return [];
  }

  const body = await response.json().catch(() => null);
  return body?.data ?? [];
}
