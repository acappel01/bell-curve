import IncludedItemList from "./IncludedItemList";
import PairWithSlider from "./PairWithSlider";

/**
 * Theme `widget-accordion` collapse block (Bootstrap data-bs attributes).
 * `parent` (a selector) makes the group exclusive — opening one collapses
 * the currently open sibling under that parent (Bootstrap's data-bs-parent).
 */
function AccordionWidget({ id, title, children, defaultOpen = false, parent }) {
  return (
    <div className="widget-accordion wd-product-descriptions">
      <div
        className={`accordion-title${defaultOpen ? "" : " collapsed"}`}
        data-bs-target={`#${id}`}
        data-bs-toggle="collapse"
        aria-expanded={defaultOpen ? "true" : "false"}
        aria-controls={id}
        role="button"
      >
        <span>{title}</span>
        <span className="icon icon-arrow-down" />
      </div>
      <div id={id} className={`collapse${defaultOpen ? " show" : ""}`} data-bs-parent={parent}>
        <div className="accordion-body widget-desc">{children}</div>
      </div>
    </div>
  );
}

/**
 * Theme `productDetails/SideAccordions.jsx` — the info-column accordion
 * stack, fully API-driven. Renders, in order: the long description
 * (theme's fixed "Descriptions" accordion), placement=accordion
 * detail_sections, then the fixed data-backed accordions — Ingredients
 * (products), Certificates of Analysis (products), included products
 * (stacks), Pair With. Accordions without content don't render; the whole
 * stack collapses to null when nothing has data.
 *
 * Pair With renders as a quick-view mini slider; `pairWithPerView`
 * ({ desktop: 1–4, mobile: 1–2 }) is the per-placement presentation knob.
 *
 * detail_sections content is admin-authored "plain text / simple HTML"
 * from this install's own backend (same trust model as the layout's custom
 * CSS/scripts), hence dangerouslySetInnerHTML.
 */
export default function SideAccordions({
  description,
  sections = [],
  ingredients = [],
  coas = [],
  includedProducts = [],
  pairsWith = [],
  pairWithPerView = { desktop: 2, mobile: 1 },
  idPrefix = "side",
}) {
  const hasContent =
    description ||
    sections.length ||
    ingredients.length ||
    coas.length ||
    includedProducts.length ||
    pairsWith.length;

  if (!hasContent) {
    return null;
  }

  // Exclusive group: only one accordion open at a time (data-bs-parent),
  // with the description open on load.
  const groupId = `${idPrefix}-accordion-group`;
  const parent = `#${groupId}`;

  return (
    <div className="tf-product-side-accordions" id={groupId}>
      {description ? (
        <AccordionWidget id={`${idPrefix}-description`} title="Descriptions" defaultOpen parent={parent}>
          <div className="item" dangerouslySetInnerHTML={{ __html: description }} />
        </AccordionWidget>
      ) : null}

      {sections.map((section, index) => (
        <AccordionWidget
          key={index}
          id={`${idPrefix}-section-${index}`}
          title={section.title}
          parent={parent}
        >
          <div className="item" dangerouslySetInnerHTML={{ __html: section.content }} />
        </AccordionWidget>
      ))}

      {ingredients.length ? (
        <AccordionWidget id={`${idPrefix}-ingredients`} title="Ingredients" parent={parent}>
          <div className="item">
            <ul>
              {ingredients.map((ingredient) => (
                <li key={ingredient.slug ?? ingredient.name}>
                  {ingredient.name}
                  {ingredient.label ? ` — ${ingredient.label}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </AccordionWidget>
      ) : null}

      {coas.length ? (
        <AccordionWidget id={`${idPrefix}-coas`} title="Certificates of Analysis" parent={parent}>
          <div className="item">
            <ul>
              {coas.map((coa, index) => (
                <li key={index}>
                  <a href={coa.file_url} target="_blank" rel="noopener noreferrer" className="link">
                    {coa.batch_number}
                  </a>
                  {coa.issued_at
                    ? ` — ${new Date(coa.issued_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        </AccordionWidget>
      ) : null}

      {includedProducts.length ? (
        <AccordionWidget id={`${idPrefix}-included`} title="What's Included" parent={parent}>
          <IncludedItemList items={includedProducts} />
        </AccordionWidget>
      ) : null}

      {pairsWith.length ? (
        <AccordionWidget id={`${idPrefix}-pairs`} title="Pair With" parent={parent}>
          <PairWithSlider
            items={pairsWith}
            desktopPerView={pairWithPerView.desktop}
            mobilePerView={pairWithPerView.mobile}
            idSuffix={`${idPrefix}-pw`}
          />
        </AccordionWidget>
      ) : null}
    </div>
  );
}
