import { API_BASE } from "@/lib/browserBase";

/**
 * Site forms (contact, waitlist, notify-me) as leads.
 *
 * ONE ENDPOINT FOR EVERY FORM. The backend already has a Leads admin with
 * consent tracking and dispositions, so a contact message or a waitlist
 * sign-up is a lead with a `source`, not a new table per form. Field names
 * that are lead columns go to their columns; everything else an operator adds
 * to a form travels in `form_fields`, so adding a question in admin needs no
 * backend change.
 *
 * PRX enhancement (logged): `POST /leads` accepts `source` and `form_fields`,
 * and requires `last_name` only for checkout and quiz leads. Until then, a
 * form without a last-name field would be rejected, which is why fixture
 * content previews instead of sending.
 */

/** Form field names stored on the lead itself rather than in `form_fields`. */
const LEAD_COLUMNS = ["first_name", "last_name", "email", "phone"];

/** Request body for `POST /leads` from a form's values. */
export function leadPayload({ source, values, context = {} }) {
  const payload = { source, form_fields: { ...context } };

  for (const [name, value] of Object.entries(values)) {
    if (name === "marketing_consent") {
      payload.email_consent = Boolean(value);
    } else if (LEAD_COLUMNS.includes(name)) {
      payload[name] = value || null;
    } else if (value !== "" && value !== null && value !== undefined) {
      payload.form_fields[name] = value;
    }
  }

  if (typeof window !== "undefined") {
    payload.landing_url = window.location.href;
    payload.referrer = document.referrer || null;
  }

  return payload;
}

/** Posts a form as a lead through the backend proxy. Throws on a non-2xx answer. */
export async function submitLead(payload) {
  const response = await fetch(`${API_BASE}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(body?.message || `Lead ${response.status}`);
    error.fieldErrors = body?.errors ?? null;
    throw error;
  }

  return (await response.json())?.data ?? null;
}
