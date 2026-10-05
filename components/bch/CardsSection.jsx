import Link from "next/link";
import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import SectionHeader from "./SectionHeader";

/**
 * Unordered set of text cards (backend type `features-grid`):
 * `features: [{ eyebrow?, title, body, cta_label?, cta_url? }]`, `columns`
 * (2 | 3 | 4) and `theme` (white | ivory | blush).
 *
 * Covers principles, "find your place to begin" routes, the Care/Shop/Health
 * Map panels on How It Works and the Shop's order-help row. A card with a URL
 * is one link, so the whole card is the tap target.
 */
export default function CardsSection({ section }) {
  const data = section.data ?? {};
  const cards = (data.features ?? []).filter((card) => card?.title);
  const theme = ["ivory", "blush"].includes(data.theme) ? data.theme : "white";
  const columns = ["2", "3", "4"].includes(String(data.columns)) ? String(data.columns) : "3";

  if (!cards.length) {
    return null;
  }

  return (
    <section className={`bch-cards bch-cards--${theme}`} id={section.anchor || undefined}>
      <div className="bch-container">
        <SectionHeader data={data} size="md" />
        <ul className={`bch-cards__grid bch-cards__grid--${columns}`}>
          {cards.map((card) => {
            const content = (
              <>
                {card.eyebrow ? <p className="bch-eyebrow">{card.eyebrow}</p> : null}
                <h3 className="bch-cards__title">{card.title}</h3>
                <Html value={card.body} className="bch-cards__text" />
                {card.cta_label ? (
                  <span className="bch-link bch-cards__cta">
                    {card.cta_label}
                    <span className="bch-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                ) : null}
              </>
            );

            return (
              <li key={card.title} className="bch-cards__item">
                {card.cta_url ? (
                  <Link href={card.cta_url} className="bch-cards__card">
                    {content}
                  </Link>
                ) : (
                  <div className="bch-cards__card">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
        {data.cta_label ? (
          <div className="bch-cards__footer">
            <CtaLink label={data.cta_label} url={data.cta_url} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
