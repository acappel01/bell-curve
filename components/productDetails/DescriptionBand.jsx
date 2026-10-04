/**
 * Theme `productDetails/Description1.jsx` — the full-width description band
 * under the details grid. The theme renders it as a stack of
 * `widget-accordion` collapse blocks (not real tabs), so the API's
 * placement=tab detail_sections stack here in order, one block each.
 * Renders nothing when no tab sections exist.
 *
 * Section content is admin-authored "plain text / simple HTML" from this
 * install's own backend (same trust model as layout custom CSS/scripts).
 */
export default function DescriptionBand({ sections = [] }) {
  if (!sections.length) {
    return null;
  }

  return (
    <section className="flat-spacing pt-0">
      <div className="container">
        {sections.map((section, index) => {
          const id = `desc-tab-${index}`;

          return (
            <div className="widget-accordion wd-product-descriptions" key={index}>
              <div
                className="accordion-title collapsed"
                data-bs-target={`#${id}`}
                data-bs-toggle="collapse"
                aria-expanded="true"
                aria-controls={id}
                role="button"
              >
                <span>{section.title}</span>
                <span className="icon icon-arrow-down" />
              </div>
              <div id={id} className="collapse">
                <div
                  className="accordion-body widget-desc"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
