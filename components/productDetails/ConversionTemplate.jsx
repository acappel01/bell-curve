import Gallery from "./Gallery";
import ProductHeading from "./ProductHeading";
import AddToCart from "./AddToCart";
import RatingRow from "./RatingRow";
import SideAccordions from "./SideAccordions";
import DescriptionBand from "./DescriptionBand";
import RailStack from "./RailStack";
import StickyCta from "./StickyCta";
import SectionRenderer from "@/components/SectionRenderer";

/**
 * V-Conversion detail template (detail_layout.template = "conversion").
 * Mobile-first order: gallery → name/price/CTA (sticky mobile CTA) →
 * star-rating row → description/About/demo/pairs-with segments directly
 * below → injected sections (FAQs and reviews among them) → configured rails.
 *
 * Rails come from detail_layout.rails: `related` is the mixed People Also
 * Bought slider; `stacks` / `associated` are the package- / product-only
 * subsets of the same related[] payload.
 */
export default function ConversionTemplate({ item, kind, pres, zoomEnabled = false }) {
  const isPackage = kind === "package";
  const images = item.gallery?.length
    ? item.gallery
    : item.hero_image_url
      ? [item.hero_image_url]
      : [];

  const accordionSections = (item.detail_sections ?? []).filter(
    (section) => section.placement === "accordion",
  );
  const tabSections = (item.detail_sections ?? []).filter(
    (section) => section.placement === "tab",
  );

  // HONOURS THE OPERATOR'S PLACEMENT KNOB. This template used to render the
  // accordions full-width below, unconditionally — so the admin's "Accordion
  // placement" select was inert here while `Details.jsx` (classic) obeyed it.
  // Combined with the knob never persisting at all, an operator could set this
  // repeatedly and never see anything change. Both halves are fixed; keep them
  // fixed together, because either one alone still looks like nothing works.
  const accordionsBelow = pres.accordions?.placement === "below";

  const accordionProps = {
    description: item.description,
    sections: accordionSections,
    ingredients: isPackage ? [] : (item.ingredients ?? []),
    coas: isPackage ? [] : (item.coas ?? []),
    includedProducts: isPackage ? (item.products ?? []) : [],
    pairsWith: item.pairs_with ?? [],
    pairWithPerView: pres.pairWith,
  };

  const defaultPlan = isPackage
    ? (item.plans?.find((plan) => plan.is_default) ?? item.plans?.[0])
    : null;
  // PACKAGES HAVE A BUY-ONCE PRICE TOO. This read `!isPackage ? … : null`,
  // because a package's own price was emitted nowhere and there was no way to
  // buy one outright. Both are true now, so the guard would only suppress a
  // price the operator had set and the API is serving.
  const buyOncePrice = item.price?.effective ?? null;

  return (
    <>
      <section className="flat-single-product pd-conversion">
        <div className="tf-main-product section-image-zoom">
          <div className="container">
            <div className="row">
              <div className="col-md-6">
                <div className="tf-product-media-wrap sticky-top">
                  {images.length ? (
                    <div className="product-thumbs-slider">
                      <Gallery images={images} name={item.name} zoomEnabled={zoomEnabled} />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="col-md-6">
                <div className="tf-zoom-main" />
                <div className="tf-product-info-wrap position-relative">
                  <div className="tf-product-info-list other-image-zoom">
                    <ProductHeading item={item} price={item.price ?? defaultPlan?.price} />

                    <div id="pd-buybox">
                      <AddToCart
                        item={item}
                        kind={kind}
                        buyOncePrice={buyOncePrice}
                        highlightsPosition={pres.highlightsPosition}
                      />
                    </div>

                    <RatingRow rating={item.rating} />

                    {item.categories?.length ? (
                      <ul className="tf-product-cate-sku text-md">
                        <li className="item-cate-sku">
                          <span className="label">Categories:</span>
                          <span className="value">
                            {item.categories.map((category) => category.name).join(", ")}
                          </span>
                        </li>
                      </ul>
                    ) : null}

                    {accordionsBelow ? null : (
                      <SideAccordions {...accordionProps} idPrefix="conv-side" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {accordionsBelow ? (
              <div className="tf-product-below-accordions">
                <SideAccordions {...accordionProps} idPrefix="conv" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <DescriptionBand sections={tabSections} />
      {/* FAQs and reviews are SECTIONS now (`item-faqs`, `item-reviews`), so
          they render from here, in the position the operator gave them, and
          only when they have been added and left enabled. They used to be
          composed below this line and gated on nothing but the record having
          some — no toggle, no position, no way to leave them off. */}
      <SectionRenderer sections={item.sections ?? []} item={item} />

      <RailStack related={item.related ?? []} rails={pres.rails} />

      <StickyCta item={item} kind={kind} />
    </>
  );
}
