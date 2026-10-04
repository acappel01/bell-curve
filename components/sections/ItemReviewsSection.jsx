import Html from "@/components/Html";
import ReviewsSegment from "@/components/productDetails/ReviewsSegment";

/**
 * `item-reviews` — this product's or stack's approved reviews, as a section.
 *
 * Reads the record's relation rather than holding content, like
 * ItemFaqsSection, and for a stronger reason: reviews are moderated customer
 * writing, so a section an operator could type them into would be a machine
 * for fabricating testimonials.
 *
 * The rows are a stand-in. The plan is for reviews to arrive from a
 * third-party integration or a syndicating widget; that changes where they
 * come from, not this section, which stays the thing that says whether they
 * appear on a given record.
 *
 * Renders nothing when the record has no approved reviews.
 */
export default function ItemReviewsSection({ section, item }) {
  const reviews = item?.reviews ?? [];

  if (!reviews.length) {
    return null;
  }

  const heading = section?.data?.heading;

  return (
    <ReviewsSegment
      rating={item?.rating}
      reviews={reviews}
      heading={heading ? <Html as="span" inline value={heading} /> : null}
      anchor={section?.anchor || null}
    />
  );
}
