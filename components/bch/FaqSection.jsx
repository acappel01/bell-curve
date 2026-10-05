import Html from "@/components/Html";
import SectionHeader from "./SectionHeader";

/**
 * Questions and answers (backend type `faq`): `faqs: [{ q, a }]` with the
 * blueprint's header fields.
 *
 * Native <details>, so every answer is in the HTML for search and readers,
 * keyboard support is the browser's own, and no client JavaScript ships.
 */
export default function FaqSection({ section }) {
  const data = section.data ?? {};
  const faqs = (data.faqs ?? []).filter((faq) => faq?.q);

  if (!faqs.length) {
    return null;
  }

  return (
    <section className="bch-faq" id={section.anchor || "faqs"}>
      <div className="bch-container bch-faq__inner">
        <div>
          <SectionHeader data={{ ...data, lead: data.lead ?? data.description }} size="md" />
        </div>
        <div className="bch-faq__list">
          {faqs.map((faq) => (
            <details key={faq.q} className="bch-faq__item">
              <summary>
                <Html value={faq.q} inline as="span" />
                <span className="bch-faq__icon" aria-hidden="true" />
              </summary>
              <Html value={faq.a} className="bch-faq__answer" />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
