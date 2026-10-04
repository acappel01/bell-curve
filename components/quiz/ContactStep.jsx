"use client";

import { consentLabels } from "@/lib/quizConsent";

/**
 * The last step: where the plan gets sent.
 *
 * EVERY STRING HERE IS OPERATOR COPY, arriving in `question.config`. That
 * includes the consent labels and the legal line under the button, and it is
 * the reason this is a reserved question kind rather than three hardcoded
 * inputs: a sentence describing what someone is consenting to must be
 * changeable by the people accountable for it, without a deploy. The existing
 * checkout hardcodes its equivalents, which is a gap worth closing separately.
 *
 * THE CHECKBOXES REFLECT STATE AND NOTHING ELSE. They previously rendered
 * `contact.email_consent ?? true`, which showed a ticked box while the value
 * behind it stayed undefined — so a visitor who left it exactly as presented
 * had their consent recorded as false. A consent control whose appearance and
 * value can disagree is the one control where that is never acceptable, in
 * either direction. The wizard seeds the defaults into state instead.
 *
 * ONE "full name" FIELD, SPLIT ON SUBMIT. The backend requires first and last
 * names and will keep doing so — it hands them to a pharmacy. But asking a
 * visitor to fill two boxes at the last step of a funnel costs completions for
 * no gain, so the split happens in the payload rather than in the form. A
 * single-word name becomes a first name with no last name, which the caller
 * has to handle; it is not this component's decision to invent one.
 */
export default function ContactStep({ question, value, onChange, errors = {} }) {
  const config = question.config ?? {};
  const contact = value ?? {};

  // Resolved through the shared module so the sentence rendered here is byte-for-
  // byte the sentence recorded in the consent audit at submit. See lib/quizConsent.js.
  const labels = consentLabels(config);

  const set = (key) => (event) => {
    const next = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    onChange({ ...contact, [key]: next });
  };

  return (
    <div className="quiz-contact">
      <div className="quiz-contact__fields">
        <Field
          id="quiz-name"
          label={config.name_label || "Full name"}
          value={contact.name ?? ""}
          onChange={set("name")}
          autoComplete="name"
          error={errors.name}
        />
        <Field
          id="quiz-email"
          label={config.email_label || "Email"}
          type="email"
          value={contact.email ?? ""}
          onChange={set("email")}
          autoComplete="email"
          error={errors.email}
        />
        <Field
          id="quiz-phone"
          label={
            (config.phone_label || "Phone") + (config.phone_required ? "" : " (optional)")
          }
          type="tel"
          value={contact.phone ?? ""}
          onChange={set("phone")}
          autoComplete="tel"
          error={errors.phone}
        />
      </div>

      <div className="quiz-contact__consents">
        <Consent
          id="quiz-consent-email"
          label={labels.email}
          checked={Boolean(contact.email_consent)}
          onChange={set("email_consent")}
        />
        <Consent
          id="quiz-consent-sms"
          label={labels.sms}
          checked={Boolean(contact.sms_consent)}
          onChange={set("sms_consent")}
        />
      </div>

      {labels.legal ? <p className="quiz-contact__legal">{labels.legal}</p> : null}
    </div>
  );
}

function Field({ id, label, error, type = "text", ...inputProps }) {
  return (
    <div className="tf-field style-2 style-3">
      <input
        className="tf-field-input tf-input"
        id={id}
        name={id}
        placeholder=" "
        type={type}
        {...inputProps}
      />
      <label className="tf-field-label" htmlFor={id}>
        {label}
      </label>
      {error ? <p className="ck-error">{error}</p> : null}
    </div>
  );
}

function Consent({ id, label, checked, onChange }) {
  return (
    <label className="quiz-contact__consent" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
