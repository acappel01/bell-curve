import Html from "../Html";
import Heading from "./Heading";

/**
 * `comparison-table` flexible type → theme "Comparison" markup (comp-*).
 * Data: heading, us_logo (sanitized inline SVG), others_label,
 * rows[{label, us, others}] (booleans → check or cross per column),
 * cta {label, url, target}.
 *
 * Three levels: `.comp-section` is the band, `.comp-column` is the
 * `.sx-content` column, and `.comp-inner` is the rounded cream CARD inside it.
 * The card is not the column on purpose — its 24–64px padding is a design
 * value, and hanging `.sx-content` on it would make `content_inset` overwrite
 * that padding and squeeze the table against the card's edge while the card
 * itself stayed pinned to the section's edges. "Inset the section's content"
 * has to move the card. Same shape as FinalCtaSection.
 *
 * This is a FLEXIBLE (admin-defined) type, which is normally the reason a cap
 * has to stay (see FlexibleSection). Not here: flexible types carry their own
 * `layout_defaults` inside the type's schema JSON — this one holds
 * `{"content_width":"xwide"}` — and `FlexibleDefinition::layoutDefaults()`
 * serves it, so a newly created section arrives capped without prx-backend
 * having to name an Atlas slug in code. Both live rows store `content_width:
 * null` and are served `xwide`, which is what makes the cap safe to delete.
 */

function CheckIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M13.3346 4L6.0013 11.3333L2.66797 8" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ComparisonTableSection({ section }) {
  const data = section.data ?? {};
  const rows = (data.rows ?? []).filter((row) => row?.label);

  if (!rows.length) {
    return null;
  }

  return (
    <section id={section.anchor || undefined} className="comp-section sx-section">
      <div className="comp-column sx-content">
        <div className="comp-inner">
          <Heading className="comp-heading" heading={data.heading} />

          <div className="comp-table">
            <div className="comp-tableHeader">
              {data.us_logo ? (
                <span className="comp-logo" dangerouslySetInnerHTML={{ __html: data.us_logo }} />
              ) : (
                <span className="comp-logo" />
              )}
              <Html as="span" inline className="comp-othersLabel" value={data.others_label} />
            </div>

            <div className="comp-rows">
              {rows.map((row) => (
                <div className="comp-row" key={row.label}>
                  {row.us ? <CheckIcon className="comp-check" /> : <CrossIcon className="comp-check" />}
                  <Html as="p" inline className="comp-label" value={row.label} />
                  {row.others ? <CheckIcon className="comp-cross" /> : <CrossIcon className="comp-cross" />}
                </div>
              ))}
            </div>
          </div>

          {data.cta?.label ? (
            <a className="comp-button" href={data.cta.url || "#"} target={data.cta.target || undefined}>
              {data.cta.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
