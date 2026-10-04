function Stars({ value }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));

  return (
    <span className="pd-reviews__stars" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i
          key={index}
          className={`icon icon-star${index < filled ? " is-filled" : ""}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/**
 * Customer reviews segment (#reviews — the rating row links here). Driven
 * by the API's approved-only `reviews` (newest first) and aggregate
 * `rating`; renders nothing when no reviews exist.
 *
 * Wears the `.sx-section` > `.sx-content` contract so the operator's width,
 * inset and alignment knobs actually reach it — see FaqSegment. `anchor`
 * falls back to "reviews", which the rating row links to.
 */
export default function ReviewsSegment({ rating, reviews = [], heading = null, anchor = null }) {
  if (!reviews.length) {
    return null;
  }

  return (
    <section className="sx-section flat-spacing pt-0 pd-reviews" id={anchor || "reviews"}>
      <div className="container sx-content">
        <div className="flat-title wow fadeInUp">
          <h4 className="title">{heading ?? "Customer Reviews"}</h4>
        </div>

        {rating?.count ? (
          <div className="pd-reviews__summary">
            <span className="pd-reviews__average">{Number(rating.average).toFixed(1)}</span>
            <Stars value={rating.average} />
            <span className="pd-reviews__count">
              Based on {rating.count} review{rating.count === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}

        <ul className="pd-reviews__list">
          {reviews.map((review) => (
            <li className="pd-reviews__item" key={review.id}>
              <div className="pd-reviews__meta">
                <Stars value={review.rating} />
                <span className="pd-reviews__author">{review.author_name}</span>
                {review.reviewed_at ? (
                  <span className="pd-reviews__date">
                    {new Date(review.reviewed_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
              </div>
              {review.title ? <p className="pd-reviews__title">{review.title}</p> : null}
              {review.body ? <p className="pd-reviews__body">{review.body}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
