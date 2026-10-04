import Html from "../Html";
import Heading from "./Heading";

/**
 * `final-cta` and `cta-banner` blueprints → theme "WellnessCta" markup
 * (wellness-*). Data: eyebrow, heading, emphasis, lead, primary_cta_*,
 * secondary_cta_*.
 *
 * The two blueprints name their subhead differently — `final-cta` calls it
 * `lead`, `cta-banner` calls it `sub` — so this reads both. Before that,
 * every `cta-banner` section silently dropped its subhead. `cta-banner` also
 * has no `emphasis` field; Heading renders nothing for the missing half.
 *
 * `.wellness-column` exists only to carry `.sx-content`, and that is the whole
 * structural decision here. `.wellness-cta` is the dark rounded CARD, with
 * 40–71px of its own padding as a design value; hanging `.sx-content` on it
 * would make `content_inset` overwrite that padding and shove the copy against
 * the card's edge, when what an operator setting "inset" means is "bring the
 * card in from the page". A column around the card gives inset that meaning
 * and costs one div. `content_width` caps the column, and the card fills it.
 */
export default function FinalCtaSection({ section }) {
  const data = section.data ?? {};

  return (
    <section id={section.anchor || undefined} className="wellness-cta-section sx-section">
      <div className="wellness-column sx-content">
        <div className="wellness-cta">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-4 gap-md-5">
            <div className="wellness-copy">
              <Html as="p" inline className="wellness-eyebrow" value={data.eyebrow} />
              <Heading className="wellness-title" heading={data.heading} emphasis={data.emphasis} />
              <Html as="p" inline className="wellness-lead" value={data.lead ?? data.sub} />
            </div>
            <div className="d-flex flex-column gap-2">
              {data.primary_cta_label ? (
                <a href={data.primary_cta_url || "#"} className="btn wellness-button">
                  {data.primary_cta_label}
                </a>
              ) : null}
              {data.secondary_cta_label ? (
                <a href={data.secondary_cta_url || "#"} className="wellness-secondary-link">
                  {data.secondary_cta_label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
