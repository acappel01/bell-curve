import Html from "@/components/Html";
import { getConfig } from "@/lib/api";
import { usingFixtures } from "@/lib/fixtures";
import SectionHeader from "./SectionHeader";
import LeadForm from "./forms/LeadForm";
import { normalizeFields } from "./forms/fields";

/**
 * A form an operator builds in admin (flexible type `bch-form`): the contact
 * page today, any "ask us" form tomorrow. Every submission files a lead with
 * the section's `source` (default "contact"), so messages land in the Leads
 * admin with its consent log and dispositions rather than in an inbox.
 *
 * Fields: eyebrow, heading, emphasis, lead, `source`, `fields[]` (see
 * ./forms/fields), consent_label, submit_label, success_message,
 * privacy_note, `layout` (split | stacked), `theme` (white | ivory), and an
 * aside: aside_heading, aside_body, `show_contact` (email, phone and hours
 * from /config contact, shown only when set) and `notice` (the boxed line, used
 * for "not for medical emergencies").
 */
export default async function FormSection({ section }) {
  const data = section.data ?? {};
  const fields = normalizeFields(data.fields);

  if (!fields.length) {
    return null;
  }

  const contact = data.show_contact ? ((await getConfig())?.contact ?? {}) : {};
  const details = [
    contact.email && { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { label: "Phone", value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, "")}` },
    contact.hours && { label: "Hours", value: contact.hours },
  ].filter(Boolean);
  const preview = usingFixtures();

  const layout = data.layout === "stacked" ? "stacked" : "split";
  const theme = data.theme === "ivory" ? "ivory" : "white";

  return (
    <section
      className={`bch-formsec bch-formsec--${layout} bch-formsec--${theme}`}
      id={section.anchor || undefined}
    >
      <div className="bch-container bch-formsec__inner">
        <div className="bch-formsec__intro">
          <SectionHeader data={data} size="md" />

          {data.aside_heading || data.aside_body || details.length || data.show_contact ? (
            <div className="bch-formsec__aside">
              {data.aside_heading ? <p className="bch-eyebrow">{data.aside_heading}</p> : null}
              <Html value={data.aside_body} className="bch-formsec__aside-body" />
              {details.length ? (
                <dl className="bch-formsec__details">
                  {details.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.href ? <a href={item.href}>{item.value}</a> : item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : data.show_contact && preview ? (
                <p className="bch-formsec__pending">Email, phone and hours appear here once they are set in admin.</p>
              ) : null}
            </div>
          ) : null}

          {data.notice ? (
            <Html value={data.notice} inline as="p" className="bch-formsec__notice" />
          ) : null}
        </div>

        <LeadForm
          fields={fields}
          source={data.source || "contact"}
          consentLabel={data.consent_label}
          submitLabel={data.submit_label || "Send message"}
          successMessage={data.success_message || "Thank you. We'll reply by email."}
          privacyNote={data.privacy_note}
          preview={preview}
        />
      </div>
    </section>
  );
}
