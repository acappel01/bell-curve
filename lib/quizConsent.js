/**
 * The consent wording, resolved once for both the thing that renders it and the
 * thing that reports it.
 *
 * THIS MODULE EXISTS TO STOP THE TWO DISAGREEING. The consent sentence is
 * operator copy on the contact question (`config.email_consent_label`), with a
 * fallback for a quiz that never set one. ContactStep renders it; the submit
 * payload records it into the backend's consent audit. If each kept its own copy
 * of the fallback, an unauthored quiz would render one sentence and file a
 * different one as evidence of what the visitor agreed to — a consent record
 * that misquotes the consent is worse than no record, because it looks
 * authoritative.
 *
 * So: one function, imported by both. Changing a fallback here changes what is
 * shown and what is stored, together.
 */

/**
 * @param {object|null|undefined} config The contact question's `config` blob.
 * @returns {{email: string, sms: string, legal: string|null}}
 */
export function consentLabels(config) {
  const c = config ?? {};

  return {
    email: c.email_consent_label || "Email me my plan",
    sms: c.sms_consent_label || "Text me about my plan",
    legal: c.legal || null,
  };
}

/**
 * The `consent_disclosures` payload: what was actually put in front of the
 * visitor, per channel.
 *
 * BOTH CHANNELS ARE ALWAYS SENT, whether or not they were ticked. The backend
 * uses presence to distinguish "declined" from "never asked" — it records a
 * `granted: false` row for a channel whose wording was shown, and nothing at all
 * for one that was not. Sending only the ticked ones would erase the fact that
 * the visitor was offered SMS and chose not to take it, which is exactly the
 * thing a later complaint turns on.
 *
 * `version` carries the legal line when there is one, so the surrounding
 * disclosure is reproducible too and not just the checkbox sentence.
 *
 * @param {object|null|undefined} config The contact question's `config` blob.
 */
export function consentDisclosures(config) {
  const labels = consentLabels(config);
  const version = labels.legal ? hash(labels.legal) : null;

  return {
    email: { text: labels.email, version },
    sms: { text: labels.sms, version },
  };
}

/**
 * A short, stable fingerprint of the legal copy.
 *
 * Not cryptographic and not meant to be — it only needs to change when the copy
 * changes, so two consent records can be compared without storing the whole
 * legal paragraph on every row. Deliberately synchronous and dependency-free:
 * SubtleCrypto is async and unavailable on insecure origins, which would make
 * this fail in exactly the local-development case where it is most often read.
 */
function hash(text) {
  let h = 5381;

  for (let i = 0; i < text.length; i += 1) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }

  return `v${(h >>> 0).toString(36)}`;
}
