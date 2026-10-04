/**
 * Per-record FAQ segment — the API's `faqs` [{id, question, answer,
 * category}] (published, pivot order) as an exclusive theme
 * widget-accordion group. Answers are admin-authored rich text from this
 * install's own backend (same trust model as detail_sections).
 *
 * `heading` overrides the default title and is a NODE, not a string, because
 * the operator authors it as inline rich text — the section wrapper renders it
 * through <Html> so markup is markup rather than printed tags. Left unset it
 * keeps the wording this segment has always used. *
 * WEARS THE TWO-CLASS CONTRACT (`.sx-section` > `.sx-content`) because it is
 * rendered by a section type now, and every operator knob has to reach it.
 * Without it the wrapper class still emitted while `sx-width`, `sx-inset` and
 * `sx-align` did nothing — those act on `.sx-content` alone — so three of the
 * five Layout knobs would have been controls that lie. That is the exact
 * defect class this section type exists to remove, so it is not acceptable
 * here of all places.
 *
 * `anchor` honours an operator-set anchor and falls back to the historic id,
 * which other parts of the page link to.
 */
export default function FaqSegment({ faqs = [], heading = null, anchor = null }) {
  if (!faqs.length) {
    return null;
  }

  const groupId = "pd-faq-group";

  return (
    <section className="sx-section flat-spacing pt-0 pd-faqSegment" id={anchor || "faqs"}>
      <div className="container sx-content">
        <div className="flat-title wow fadeInUp">
          <h4 className="title">{heading ?? "Frequently Asked Questions"}</h4>
        </div>
        <div id={groupId}>
          {faqs.map((faq) => {
            const id = `pd-faq-${faq.id}`;

            return (
              <div className="widget-accordion wd-product-descriptions" key={faq.id}>
                <div
                  className="accordion-title collapsed"
                  data-bs-target={`#${id}`}
                  data-bs-toggle="collapse"
                  aria-expanded="false"
                  aria-controls={id}
                  role="button"
                >
                  <span>{faq.question}</span>
                  <span className="icon icon-arrow-down" />
                </div>
                <div id={id} className="collapse" data-bs-parent={`#${groupId}`}>
                  <div
                    className="accordion-body widget-desc"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
