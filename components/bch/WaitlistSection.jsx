import { usingFixtures } from "@/lib/fixtures";
import SectionHeader from "./SectionHeader";
import WaitlistForm from "./WaitlistForm";

/**
 * Waitlist / notify-me form (flexible type `bch-waitlist`).
 *
 * Fields: `service` (care | shop | membership), `ask_state`,
 * `interest_options` (optional non-sensitive choices), `consent_label`,
 * `submit_label`, `success_message`, `privacy_note`.
 *
 * The client's rule for the Care list: name, email and state only, an optional
 * non-sensitive interest, separate unticked marketing consent, and no symptoms,
 * diagnoses or medications. The same section serves the Shop "tell me when it
 * opens" list and the Membership waitlist.
 *
 * The backend has no waitlist endpoint yet (PRX enhancement), so on fixture
 * content the form renders as a preview and sends nothing.
 */
export default function WaitlistSection({ section }) {
  const data = section.data ?? {};

  return (
    <section className="bch-waitlist" id={section.anchor || undefined}>
      <div className="bch-container bch-waitlist__inner">
        <SectionHeader data={{ ...data, lead: data.lead ?? data.body }} size="md" />
        <WaitlistForm
          service={data.service}
          askState={data.ask_state !== false}
          interests={(data.interest_options ?? []).filter(Boolean)}
          consentLabel={data.consent_label}
          submitLabel={data.submit_label || "Join the list"}
          successMessage={data.success_message || "Thank you. We'll email you when it's available."}
          privacyNote={data.privacy_note}
          preview={usingFixtures()}
        />
      </div>
    </section>
  );
}
