"use client";
import { useId, useState } from "react";

// Two-letter codes the provider network is licensed by; DC included.
const STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " "
  );

/**
 * The waitlist form itself. Posts JSON to the backend proxy at
 * `/api/backend/waitlist`. `preview` (fixture content) keeps every field
 * usable but sends nothing, and says so.
 */
export default function WaitlistForm({
  service,
  askState,
  interests,
  consentLabel,
  submitLabel,
  successMessage,
  privacyNote,
  preview,
}) {
  const id = useId();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (preview) {
      setStatus("preview");
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/backend/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          service,
          first_name: form.get("first_name"),
          email: form.get("email"),
          state: form.get("state") || null,
          interest: form.get("interest") || null,
          marketing_consent: form.get("marketing_consent") === "on",
        }),
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      setStatus("done");
    } catch {
      setStatus("idle");
      setError("We couldn't add you just now. Please check your details and try again.");
    }
  }

  if (status === "done") {
    return (
      <p className="bch-waitlist__done" role="status">
        {successMessage}
      </p>
    );
  }

  return (
    <form className="bch-waitlist__form" onSubmit={onSubmit} noValidate={false}>
      <div className="bch-waitlist__row">
        <label htmlFor={`${id}-name`}>
          <span>First name</span>
          <input id={`${id}-name`} name="first_name" autoComplete="given-name" required maxLength={100} />
        </label>
        <label htmlFor={`${id}-email`}>
          <span>Email</span>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={255} />
        </label>
      </div>

      {askState || interests.length ? (
        <div className="bch-waitlist__row">
          {askState ? (
            <label htmlFor={`${id}-state`}>
              <span>State</span>
              <select id={`${id}-state`} name="state" required defaultValue="" autoComplete="address-level1">
                <option value="" disabled>
                  Select your state
                </option>
                {STATES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {interests.length ? (
            <label htmlFor={`${id}-interest`}>
              <span>
                Most interested in <span className="bch-waitlist__optional">(optional)</span>
              </span>
              <select id={`${id}-interest`} name="interest" defaultValue="">
                <option value="">No preference</option>
                {interests.map((interest) => (
                  <option key={interest} value={interest}>
                    {interest}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {consentLabel ? (
        <label className="bch-waitlist__consent" htmlFor={`${id}-consent`}>
          <input id={`${id}-consent`} name="marketing_consent" type="checkbox" />
          <span>{consentLabel}</span>
        </label>
      ) : null}

      <div className="bch-waitlist__submit">
        <button type="submit" className="bch-btn bch-btn--primary" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : submitLabel}
        </button>
        {privacyNote ? <p className="bch-waitlist__privacy">{privacyNote}</p> : null}
      </div>

      {error ? (
        <p className="bch-waitlist__error" role="alert">
          {error}
        </p>
      ) : null}
      {status === "preview" ? (
        <p className="bch-waitlist__preview" role="status">
          Preview only. This form connects once the waitlist endpoint is live, so nothing was sent.
        </p>
      ) : null}
    </form>
  );
}
