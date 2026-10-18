import { usingFixtures } from "@/lib/fixtures";
import SectionHeader from "./SectionHeader";
import LeadForm from "./forms/LeadForm";
import { normalizeFields } from "./forms/fields";

/**
 * Waitlist / notify-me form (flexible type `bch-waitlist`).
 *
 * Fields: `service` (care | shop | membership), `ask_state`,
 * `interest_options` (optional non-sensitive choices), `consent_label`,
 * `submit_label`, `success_message`, `privacy_note`.
 *
 * The client's rule for the Care list: name, email and state only, an optional
 * non-sensitive interest, separate unticked marketing consent, and no symptoms,
 * diagnoses or medications. That rule is why this type keeps its fixed field
 * list instead of an editable one: it is the generic `LeadForm` (shared with
 * `bch-form`) given a field set an operator cannot widen by accident. It files
 * a lead with `source: "waitlist"` and the service in `form_fields`.
 */
export default function WaitlistSection({ section }) {
  const data = section.data ?? {};
  const interests = (data.interest_options ?? []).filter(Boolean);

  const fields = normalizeFields([
    { name: "first_name", label: "First name", kind: "text", required: true, width: "half" },
    { name: "email", label: "Email", kind: "email", required: true, width: "half" },
    data.ask_state !== false && {
      name: "state",
      label: "State",
      kind: "state",
      required: true,
      width: "half",
      placeholder: "Select your state",
    },
    interests.length && {
      name: "interest",
      label: "Most interested in",
      kind: "select",
      width: "half",
      options: interests,
    },
  ]);

  return (
    <section className="bch-waitlist" id={section.anchor || undefined}>
      <div className="bch-container bch-waitlist__inner">
        <SectionHeader data={{ ...data, lead: data.lead ?? data.body }} size="md" />
        <LeadForm
          fields={fields}
          source="waitlist"
          context={{ service: data.service ?? null }}
          consentLabel={data.consent_label}
          submitLabel={data.submit_label || "Join the list"}
          successMessage={data.success_message || "Thank you. We'll email you when it's available."}
          privacyNote={data.privacy_note}
          preview={usingFixtures()}
          previewMessage="Preview only. This form connects once the backend is installed, so nothing was sent."
        />
      </div>
    </section>
  );
}
