import { consentDisclosures } from "@/lib/quizConsent";
import { referralFields } from "@/lib/referral";
import { API_BASE } from "@/lib/browserBase";

/**
 * Browser-side client for the intake quiz's protocol preview.
 *
 * Separate from `lib/api.js` on purpose, and it is not an oversight that this
 * one runs in the browser. `lib/api.js` is server-only and CACHES — it is for
 * content, which is the same for everyone and tagged so the backend can
 * invalidate it. A protocol preview is the opposite of that: it is specific to
 * one visitor's answers, it must never be cached, and it must never be
 * attributed to a build-time render. So it goes through this app's own proxy
 * like the cart does, which attaches the bearer token server-side.
 *
 * Nothing here is persisted. The preview endpoint stores no row — answers
 * become a record only at lead submission, which is a separate consented step.
 */

/**
 * Where these calls go, and why it is no longer an env var.
 *
 * This used to read NEXT_PUBLIC_API_BASE_URL, which was inlined at BUILD time
 * — so an unset value was not a runtime lookup returning undefined, it was
 * baked in as undefined and every call failed identically forever. `fetch`
 * received "undefined/protocol/preview", treated it as a RELATIVE url,
 * requested it against the page's own origin, and the browser reported
 * "Failed to fetch", naming neither the missing variable nor the rebuild that
 * would fix it. That failure mode is gone: the base is a constant path to this
 * app's own proxy, which cannot be unset and needs no rebuild to be correct.
 */
function base() {
  return API_BASE;
}

/**
 * Ask the backend what this visitor may be offered.
 *
 * `sex` and `age` are both optional and omitting them means "not asked" — the
 * backend treats a missing answer as permissive and returns the unfiltered
 * shelf. Sending `null` explicitly does the same thing; what must NOT happen
 * is sending a guessed value.
 *
 * @param {{goals: string[], sex?: string|null, age?: number|null}} answers
 * @returns {Promise<{data: object[], meta: object}>}
 */
export async function fetchProtocolPreview({ goals, sex = null, age = null }) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return { data: [], meta: { goal_count: 0, filtered: false } };
  }

  const endpoint = `${base()}/protocol/preview`;

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // Never cached — see the note above. An intermediary caching this would
      // serve one visitor's filtered protocol to another.
      cache: "no-store",
      body: JSON.stringify({ goals, sex, age }),
    });
  } catch (cause) {
    // A rejected fetch means the request never got a response: wrong host,
    // backend down, DNS, a blocked mixed-content request, or CORS. The
    // browser deliberately does not say which, so name the URL that failed —
    // without it "Failed to fetch" gives the operator nothing to act on.
    throw new Error(`Could not reach ${endpoint}. ${cause.message}`, { cause });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Protocol preview failed (${response.status})`);
  }

  return response.json();
}

/**
 * Submit the quiz as a lead.
 *
 * ONLY ANSWERS TO QUESTIONS THAT WERE ACTUALLY ASKED are sent. `steps` is the
 * VISIBLE set the walker rendered, so a question the visitor branched away
 * from contributes nothing even if they answered it earlier and then changed
 * their mind. The server re-evaluates the same conditions against what arrives
 * and rejects answers to questions that were never askable — this is the
 * convenience half of that rule, not the enforcement.
 *
 * The contact answer is unpacked into the lead's own columns rather than
 * travelling inside `quiz_answers`: name, email, phone and the two consents
 * are real fields on a lead, and a second copy in a JSON blob is a second
 * email address that can disagree with the first.
 */
export async function submitQuiz({ quiz, steps, answers }) {
  const asked = steps.flatMap((step) => step.questions);
  const contactQuestion = asked.find((q) => q.kind === "contact");
  const contact = (contactQuestion ? answers[contactQuestion.slug] : null) ?? {};

  const quizAnswers = {};

  for (const question of asked) {
    if (question.kind === "contact") {
      continue;
    }

    const value = answers[question.slug];

    if (value !== undefined && value !== null && value !== "") {
      quizAnswers[question.slug] = value;
    }
  }

  const { firstName, lastName } = splitName(contact.name ?? "");

  const payload = {
    first_name: firstName,
    last_name: lastName,
    email: contact.email ?? "",
    phone: contact.phone || null,
    email_consent: Boolean(contact.email_consent),
    sms_consent: Boolean(contact.sms_consent),

    // What the visitor was actually shown, per channel, so the backend's consent
    // audit records the sentence rather than just the tick. Resolved from the
    // same module ContactStep renders from — see lib/quizConsent.js for why that
    // matters. Omitted entirely when there was no contact step, because claiming
    // a disclosure was shown when none was is worse than recording nothing.
    ...(contactQuestion ? { consent_disclosures: consentDisclosures(contactQuestion.config) } : {}),
    quiz_slug: quiz?.slug ?? null,
    quiz_answers: quizAnswers,
    ...attribution(),
    // Read from the first-party cookies the edge middleware set at LANDING, so a
    // referral survives the visitor browsing before they submit. `attribution()`
    // above still runs and still reads the URL at submit time — it is the weaker
    // source, and the backend prefers the click's own landing values when
    // backfilling, so the two do not fight.
    ...referralFields(),
  };

  const endpoint = `${base()}/leads`;

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  } catch (cause) {
    throw new Error(`Could not reach ${endpoint}. ${cause.message}`, { cause });
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.message ?? `Lead submission failed (${response.status})`);

    // Laravel's 422 shape, flattened to one message per field so the contact
    // step can put each against its own input.
    if (response.status === 422 && body?.errors) {
      error.fieldErrors = mapFieldErrors(body.errors);
    }

    throw error;
  }

  return body?.data ?? body;
}

/**
 * "Andrew Cappello" -> first + last.
 *
 * The quiz asks for one name because two boxes at the last step of a funnel
 * cost completions; the backend needs two because it hands them to a pharmacy.
 * A single word becomes a first name with an EMPTY last name rather than a
 * duplicated one — inventing "Cher Cher" puts a wrong surname on a
 * prescription, and an empty one is a validation error the visitor can see and
 * fix.
 */
function splitName(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function mapFieldErrors(errors) {
  const mapped = {};

  for (const [key, messages] of Object.entries(errors)) {
    const message = Array.isArray(messages) ? messages[0] : String(messages);

    // The form has one "name" box; the backend validates two fields behind it.
    if (key === "first_name" || key === "last_name") {
      mapped.name = mapped.name ?? message;
      continue;
    }

    mapped[key] = message;
  }

  return mapped;
}

/**
 * Where this visitor came from.
 *
 * Every attribution column on `leads` has existed for months and every one of
 * them is null, because nothing ever populated them — so "which funnel
 * produced revenue" has been unanswerable. Reading them here is the cheap half
 * of fixing that.
 *
 * Wrapped because `document`/`location` are absent during any server render
 * and a thrown error here would take the whole submission with it. Missing
 * attribution is worth strictly less than a lost lead.
 */
function attribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = {};

    for (const key of ["source", "medium", "campaign", "term", "content"]) {
      const value = params.get(`utm_${key}`);

      if (value) {
        utm[`utm_${key}`] = value.slice(0, 255);
      }
    }

    return {
      ...utm,
      referrer: document.referrer ? document.referrer.slice(0, 2048) : null,
      landing_url: window.location.href.slice(0, 2048),
    };
  } catch {
    return {};
  }
}
