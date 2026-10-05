"use client";
import { useId, useState } from "react";
import { leadPayload, submitLead } from "@/lib/leadForms";
import { US_STATES } from "./fields";

/**
 * A BCH site form that files a lead (contact, waitlist, notify-me).
 *
 * Renders whatever `fields` it is given (see ./fields), so the contact page
 * and the waitlists are the same component with different field lists, and a
 * question an operator adds in admin appears without a deploy. `context` is
 * fixed data sent with every submission (the waitlist's `service`).
 *
 * `preview` (fixture content) keeps every control usable but sends nothing,
 * and says so.
 */
export default function LeadForm({
  fields,
  source,
  context,
  consentLabel,
  submitLabel = "Send",
  successMessage = "Thank you. We'll be in touch.",
  privacyNote,
  preview = false,
  previewMessage = "Preview only. This form connects once the backend is installed, so nothing was sent.",
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

    const values = {};
    for (const field of fields) {
      values[field.name] = field.kind === "checkbox" ? form.get(field.name) === "on" : (form.get(field.name) ?? "");
    }
    if (consentLabel) {
      values.marketing_consent = form.get("marketing_consent") === "on";
    }

    setStatus("sending");
    setError("");

    try {
      await submitLead(leadPayload({ source, values, context }));
      setStatus("done");
    } catch {
      setStatus("idle");
      setError("We couldn't send that just now. Please check your details and try again.");
    }
  }

  if (status === "done") {
    return (
      <p className="bch-form__done" role="status">
        {successMessage}
      </p>
    );
  }

  return (
    <form className="bch-form" onSubmit={onSubmit}>
      <div className="bch-form__grid">
        {fields.map((field) => (
          <Field key={field.name} field={field} id={`${id}-${field.name}`} />
        ))}
      </div>

      {consentLabel ? (
        <label className="bch-form__check" htmlFor={`${id}-consent`}>
          <input id={`${id}-consent`} name="marketing_consent" type="checkbox" />
          <span>{consentLabel}</span>
        </label>
      ) : null}

      <div className="bch-form__submit">
        <button type="submit" className="bch-btn bch-btn--primary" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : submitLabel}
        </button>
        {privacyNote ? <p className="bch-form__privacy">{privacyNote}</p> : null}
      </div>

      {error ? (
        <p className="bch-form__notice" role="alert">
          {error}
        </p>
      ) : null}
      {status === "preview" ? (
        <p className="bch-form__notice" role="status">
          {previewMessage}
        </p>
      ) : null}
    </form>
  );
}

function Field({ field, id }) {
  const className = `bch-form__field${field.width === "half" ? " bch-form__field--half" : ""}`;

  if (field.kind === "checkbox") {
    return (
      <label className={`${className} bch-form__check`} htmlFor={id}>
        <input id={id} name={field.name} type="checkbox" required={field.required} />
        <span>{field.label}</span>
      </label>
    );
  }

  const common = {
    id,
    name: field.name,
    required: field.required,
    autoComplete: field.autocomplete,
    "aria-describedby": field.help ? `${id}-help` : undefined,
  };

  let control;

  if (field.kind === "textarea") {
    control = <textarea {...common} rows={5} maxLength={5000} placeholder={field.placeholder ?? undefined} />;
  } else if (field.kind === "select" || field.kind === "state") {
    const options =
      field.kind === "state" ? US_STATES.map((code) => ({ value: code, label: code })) : field.options;

    control = (
      <select {...common} defaultValue="">
        <option value="" disabled={field.required}>
          {field.placeholder ?? (field.required ? "Select one" : "No preference")}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <input {...common} type={field.kind} maxLength={255} placeholder={field.placeholder ?? undefined} />
    );
  }

  return (
    <label className={className} htmlFor={id}>
      <span>
        {field.label}
        {field.required ? null : <span className="bch-form__optional"> (optional)</span>}
      </span>
      {control}
      {field.help ? (
        <span className="bch-form__help" id={`${id}-help`}>
          {field.help}
        </span>
      ) : null}
    </label>
  );
}
