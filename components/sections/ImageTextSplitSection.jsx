import Html from "../Html";
import Heading from "./Heading";

/** ★★★★☆-style row, filled to the nearest whole star. */
function Stars({ value }) {
  const filled = Math.round(Math.min(5, Math.max(0, Number(value))));

  return (
    <span className="science-floatCardStars" aria-label={`${value} out of 5 stars`}>
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
    </span>
  );
}

/**
 * `image-text-split` blueprint → theme "Science" editorial block. Data:
 * eyebrow, heading, body (rich text HTML from the admin editor), image
 * ({url, alt, width, height} resolved by the backend), image_alt, cta_label,
 * cta_url, image_right, float_cards.* {position "bottom-left"|"top-right",
 * icon, value, text, rating_value, rating_text} — frosted cards floated
 * over the image (Figma 1070-8760).
 */
export default function ImageTextSplitSection({ section }) {
  const data = section.data ?? {};
  const floatCards = (data.float_cards ?? []).filter(
    (card) => card?.value || card?.text || card?.icon?.url,
  );

  return (
    <section
      id={section.anchor || undefined}
      className={`science sx-section${data.image_right ? " science--image-right" : ""}`}
    >
      <div className="grid sx-content">
        <div className="textColumn">
          <Html as="span" inline className="badgeLabel" value={data.eyebrow} />

          <div className="headingGroup">
            <Heading className="heading" heading={data.heading} emphasis={data.emphasis} />
            <Html as="p" inline className="description" value={data.lead} />
          </div>

          {data.cta_label ? (
            <a className="ctaButton" href={data.cta_url || "#"}>
              {data.cta_label}
            </a>
          ) : null}
        </div>

        <div className="mediaColumn">
          <Html className="intro" value={data.body} />
          {data.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="science-image"
              src={data.image.url}
              alt={data.image_alt || data.image.alt || ""}
              width={data.image.width || undefined}
              height={data.image.height || undefined}
            />
          ) : null}

          {floatCards.map((card, index) => (
            <div
              key={index}
              className={`science-floatCard science-floatCard--${
                card.position === "top-right" ? "top-right" : "bottom-left"
              }`}
            >
              {card.icon?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="science-floatCardIcon"
                  src={card.icon.url}
                  alt=""
                />
              ) : null}
              {card.value ? (
                <Html as="p" inline className="science-floatCardValue" value={card.value} />
              ) : null}
              {card.text ? (
                <Html as="p" inline className="science-floatCardText" value={card.text} />
              ) : null}
              {card.rating_value || card.rating_text ? (
                <p className="science-floatCardRating">
                  {card.rating_value ? <Stars value={card.rating_value} /> : null}
                  {card.rating_text ? (
                    <>
                      {" "}
                      <Html as="span" inline value={card.rating_text} />
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
