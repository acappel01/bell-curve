import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import Picture from "./Picture";
import SideNote from "./SideNote";

/**
 * Health Map introduction (flexible type `bch-health-map-teaser`).
 *
 * Replaces the mockup's "72%" ring, which the client removed: the card lists
 * the Health Map's NAMED educational pathways (`categories: [{ label }]`) and
 * never a score, percentage or anything that reads as a diagnosis.
 *
 * The approved photograph has its curved white corner built in and the client
 * asked for it to be shown exactly as supplied, so it gets no mask of its own.
 */
export default function HealthMapTeaserSection({ section }) {
  const data = section.data ?? {};
  const categories = (data.categories ?? []).filter((item) => item?.label);

  return (
    <section className="bch-map" id={section.anchor || undefined}>
      <div className="bch-map__media">
        <Picture image={data.image} className="bch-map__picture" sizes="(min-width: 1024px) 55vw, 100vw" />
        <SideNote value={data.side_note} className="bch-map__note" />
      </div>

      <div className="bch-map__copy">
        <Heading className="bch-display bch-display--lg" heading={data.heading} emphasis={data.emphasis} />
        <Html value={data.body} inline as="p" className="bch-lead" />
        <CtaLink label={data.cta_label} url={data.cta_url} />

        {categories.length ? (
          <div className="bch-map__card">
            {data.card_title ? <p className="bch-eyebrow">{data.card_title}</p> : null}
            <ul className="bch-map__list">
              {categories.map((item) => (
                <li key={item.label}>
                  <span className="bch-map__check" aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="20" height="20">
                      <circle cx="10" cy="10" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M6 10.4l2.6 2.5L14.2 7.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
            <Html value={data.card_caption} inline as="p" className="bch-map__caption" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
