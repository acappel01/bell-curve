/**
 * Input formatting for the checkout intake form.
 *
 * Deliberately hand-rolled rather than pulling in a masking library: these are
 * two fixed formats totalling ~40 lines, and this repo does not add
 * dependencies without asking. If a richer mask is ever needed, these are the
 * seams to replace.
 *
 * The pattern throughout is DISPLAY vs TRANSPORT. What a person types is
 * formatted for reading; what the API receives is the shape prescribe-rx
 * documents. Never send the display string — the parentheses and spaces in a
 * phone number are ours, not theirs.
 */

/** Digits only, capped — the substrate both masks build on. */
function digits(value, max) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, max);
}

/**
 * Progressive phone mask: 5125550142 → (512) 555-0142.
 *
 * Progressive matters — it formats what is there rather than waiting for ten
 * digits, so the field reads correctly mid-typing and backspace does not fight
 * the mask.
 */
export function formatPhone(value) {
  const d = digits(value, 10);

  if (d.length <= 3) {
    return d;
  }
  if (d.length <= 6) {
    return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  }

  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Transport shape for the API: 5125550142 → 512-555-0142.
 *
 * prescribe-rx stores the phone as sent and normalises to E.164 downstream, so
 * the dashed form is what goes on the wire — not the display string.
 */
export function phoneForApi(value) {
  const d = digits(value, 10);

  if (d.length !== 10) {
    return null;
  }

  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isCompletePhone(value) {
  return digits(value, 10).length === 10;
}

/** Progressive date mask: 01021990 → 01/02/1990. */
export function formatDob(value) {
  const d = digits(value, 8);

  if (d.length <= 2) {
    return d;
  }
  if (d.length <= 4) {
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  }

  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * mm/dd/yyyy → ISO yyyy-mm-dd, which is what the API requires.
 *
 * Returns null on anything that is not a real calendar date. The round-trip
 * check catches impossible dates that pass a regex — 02/31/1990 constructs a
 * Date of March 3rd, so comparing the parts back is what rejects it.
 */
export function dobForApi(value) {
  const d = digits(value, 8);

  if (d.length !== 8) {
    return null;
  }

  const month = Number(d.slice(0, 2));
  const day = Number(d.slice(2, 4));
  const year = Number(d.slice(4));

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

/** ISO yyyy-mm-dd → mm/dd/yyyy, for seeding the field from a saved value. */
export function dobFromIso(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return "";
  }

  const [year, month, day] = iso.split("-");

  return `${month}/${day}/${year}`;
}

/**
 * Whole years between an ISO date and today, in UTC.
 *
 * Used for the 18+ check. The backend enforces this too (`before:-18 years`)
 * and prescribe-rx carries its own preclusion rule — this exists so a visitor
 * finds out before filling in the rest of the form, not so the rule lives
 * here.
 */
export function ageFromIso(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }

  const [year, month, day] = iso.split("-").map(Number);
  const now = new Date();
  let age = now.getUTCFullYear() - year;

  const hadBirthday =
    now.getUTCMonth() + 1 > month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);

  if (!hadBirthday) {
    age -= 1;
  }

  return age;
}
