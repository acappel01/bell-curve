/**
 * Star-rating row under the buy box (V-Conversion order: gallery →
 * name/price/CTA → rating). Driven by the API's aggregate `rating`
 * {average, count} — null when there are no approved reviews, in which
 * case nothing renders (never fabricate a rating). Links down to the
 * #reviews segment.
 */
export default function RatingRow({ rating }) {
  const count = Number(rating?.count) || 0;

  if (!count) {
    return null;
  }

  const average = Number(rating.average) || 0;
  const filled = Math.max(0, Math.min(5, Math.round(average)));

  return (
    <a href="#reviews" className="pd-ratingRow">
      <span className="pd-ratingRow__stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <i
            key={index}
            className={`icon icon-star${index < filled ? " is-filled" : ""}`}
          />
        ))}
      </span>
      <span className="pd-ratingRow__text">
        {average.toFixed(1)} ({count} review{count === 1 ? "" : "s"})
      </span>
    </a>
  );
}
