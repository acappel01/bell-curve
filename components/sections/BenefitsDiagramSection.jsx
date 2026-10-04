import Heading from "./Heading";
import Html from "../Html";
import SectionCta from "./SectionCta";

/**
 * `benefits-diagram` blueprint → centered product shot ringed by benefit
 * points (Figma 1268-3505). Mobile-first: heading, image over its halo,
 * points as a stacked list, rating row, CTA. ≥992px the points split into
 * left/right columns with dashed connectors toward the centerpiece.
 * Data: heading, image, image_alt, marker_style dot|number|icon, points
 * [{text, side, icon}], rating_value, rating_text, cta_* (SectionCta),
 * cta_subtext (renders with the theme's protection glyph).
 */
export default function BenefitsDiagramSection({ section }) {
  const data = section.data ?? {};
  const points = (data.points ?? []).filter((point) => point?.text);
  const left = points.filter((point) => point.side !== "right");
  const right = points.filter((point) => point.side === "right");
  const markerStyle = data.marker_style || "dot";
  const stars = Math.max(0, Math.min(5, Math.round(Number(data.rating_value) || 0)));
  const showRating = Boolean(data.rating_value || data.rating_text);

  const renderMarker = (point) => (
    <span
      className={`benefits-diagram__marker benefits-diagram__marker--${markerStyle}`}
      aria-hidden="true"
    >
      {markerStyle === "number" ? points.indexOf(point) + 1 : null}
      {markerStyle === "icon" && point.icon?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={point.icon.url} alt="" />
      ) : null}
    </span>
  );

  const renderPoint = (point, index) => (
    <li className="benefits-diagram__point" key={index}>
      <Html as="span" inline className="benefits-diagram__label" value={point.text} />
      <span className="benefits-diagram__connector" aria-hidden="true" />
      {renderMarker(point)}
    </li>
  );

  return (
    <section id={section.anchor || undefined} className="benefits-diagram sx-section">
      {/*
        The four blocks below were siblings of the <section>, which left this
        type with no content column at all — content_width / inset / align were
        among the knobs that silently did nothing. This wrapper is that column.
      */}
      <div className="benefits-diagram__inner sx-content">
        {data.heading ? (
          <Heading className="benefits-diagram__heading" heading={data.heading} />
        ) : null}

        <div className="benefits-diagram__stage">
          <ul className="benefits-diagram__column benefits-diagram__column--left">
            {left.map(renderPoint)}
          </ul>

          <div className="benefits-diagram__center">
            {data.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="benefits-diagram__image"
                src={data.image.url}
                alt={data.image_alt || data.image.alt || ""}
              />
            ) : null}
          </div>

          <ul className="benefits-diagram__column benefits-diagram__column--right">
            {right.map(renderPoint)}
          </ul>
        </div>

        {showRating ? (
          <p className="benefits-diagram__rating">
            <span className="benefits-diagram__stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <i
                  key={index}
                  className={`icon icon-star${index < stars ? " is-filled" : ""}`}
                />
              ))}
            </span>
            {data.rating_text ? (
              <Html as="span" inline className="benefits-diagram__rating-text" value={data.rating_text} />
            ) : null}
          </p>
        ) : null}

        <div className="benefits-diagram__actions">
          <SectionCta data={data} className="benefits-diagram__cta" />
          {data.cta_subtext ? (
            <p className="benefits-diagram__subtext">
              <i className="icon icon-protection" aria-hidden="true" />{" "}
              <Html as="span" inline value={data.cta_subtext} />
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
