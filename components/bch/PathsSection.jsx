import Link from "next/link";
import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import Picture from "./Picture";

/**
 * Three editorial routes (flexible type `bch-paths`):
 * `items: [{ label, body, url, image }]`, then one shared CTA.
 *
 * The cards are deliberately NOT an equal grid (client: "avoid equal-sized
 * card grids"): the middle card is narrower with an arched image, the outer
 * two carry opposing curves, following the approved layout reference.
 */
export default function PathsSection({ section }) {
  const data = section.data ?? {};
  const items = (data.items ?? []).filter((item) => item?.label);

  if (!items.length) {
    return null;
  }

  return (
    <section className="bch-paths" id={section.anchor || undefined}>
      <div className="bch-container">
        <Heading className="bch-display bch-display--lg bch-paths__title" heading={data.heading} emphasis={data.emphasis} />

        <ul className="bch-paths__list">
          {items.map((item) => (
            <li key={item.label} className="bch-paths__item">
              <Link href={item.url || "#"} className="bch-paths__card">
                <Picture image={item.image} className="bch-paths__picture" sizes="(min-width: 1024px) 33vw, 100vw" />
                <span className="bch-paths__text">
                  <span className="bch-paths__label">{item.label}</span>
                  <Html value={item.body} inline as="span" className="bch-paths__body" />
                </span>
                <span className="bch-circle-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="bch-paths__cta">
          <CtaLink label={data.cta_label} url={data.cta_url} />
        </div>
      </div>
    </section>
  );
}
