import Html from "@/components/Html";
import FaqSegment from "@/components/productDetails/FaqSegment";

/**
 * `item-faqs` — this product's or stack's own FAQs, as a section.
 *
 * READS THE RECORD, NOT THE SECTION. The questions live on the record's FAQs
 * relation, where the operator already authors them; this section carries only
 * a heading and decides whether, and where, they appear. That is why it needs
 * `item`, which SectionRenderer passes on the catalog detail routes and has
 * nowhere else — the type is catalog-only for exactly that reason.
 *
 * Renders nothing when the record has no published FAQs, so adding it to a
 * record without any is an absence rather than an empty heading. Before this
 * existed the FAQs rendered on every detail page purely because the record had
 * some: no toggle, no position, no way to leave them off.
 */
export default function ItemFaqsSection({ section, item }) {
  const faqs = item?.faqs ?? [];

  if (!faqs.length) {
    return null;
  }

  const heading = section?.data?.heading;

  return (
    <FaqSegment
      faqs={faqs}
      heading={heading ? <Html as="span" inline value={heading} /> : null}
      anchor={section?.anchor || null}
    />
  );
}
