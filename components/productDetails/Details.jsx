import Gallery from "./Gallery";
import ProductHeading from "./ProductHeading";
import SideAccordions from "./SideAccordions";
import AddToCart from "./AddToCart";

/**
 * Theme `productDetails/Details1.jsx` — gallery column + info column —
 * driven by a catalog detail payload (product or package). Ported minus the
 * demo-only pieces: cart/quantity controls (no cart module yet), the
 * hardcoded SKU row, buy-once CTA, and the delivery/return copy band
 * (content-free rule). Categories render in the theme's cate-sku list when
 * the API supplies them.
 *
 * `kind` is "product" | "package"; packages contribute the plan grid and
 * included-products accordion, products the ingredients/COA accordions.
 *
 * Takes an ALREADY-NORMALIZED `pres` (see ./presentation.js), exactly as
 * ConversionTemplate does. It used to re-normalize the record itself with the
 * route's `pres` as overrides, which was not merely redundant: normalizing a
 * normalized object is lossy for rails, because `none` resolves to an empty
 * list on the first pass and an empty list means "unset" on the second — so a
 * page with rails deliberately turned off would have had the default rail
 * resurrected by any reader here. One normalize, at the route.
 *
 * `pres` selects the accordion placement —
 * "side" keeps the stack in the info column, "below" moves it full-width
 * under the gallery/info row (above the trust band once that ships). The
 * backend's future per-record detail_layout feeds the same normalizer.
 */
export default function Details({ item, kind, pres, zoomEnabled = false }) {
  const isPackage = kind === "package";
  const accordionsBelow = pres.accordions.placement === "below";
  const images = item.gallery?.length
    ? item.gallery
    : item.hero_image_url
      ? [item.hero_image_url]
      : [];

  const accordionSections = (item.detail_sections ?? []).filter(
    (section) => section.placement === "accordion",
  );

  const defaultPlan = isPackage
    ? (item.plans?.find((plan) => plan.is_default) ?? item.plans?.[0])
    : null;

  // Product term plans (Figma V1): % off is computed against the product's
  // own effective price as the per-month reference; the product price also
  // feeds the "Or buy once" line under the grid.
  // PACKAGES HAVE A BUY-ONCE PRICE TOO. This read `!isPackage ? … : null`,
  // because a package's own price was emitted nowhere and there was no way to
  // buy one outright. Both are true now, so the guard would only suppress a
  // price the operator had set and the API is serving.
  const buyOncePrice = item.price?.effective ?? null;

  return (
    <section className="flat-single-product">
      <div className="tf-main-product section-image-zoom">
        <div className="container">
          <div className="row">
            {/* Product Images */}
            <div className="col-md-6">
              <div className="tf-product-media-wrap sticky-top">
                {images.length ? (
                  <div className="product-thumbs-slider">
                    <Gallery images={images} name={item.name} zoomEnabled={zoomEnabled} />
                  </div>
                ) : null}
              </div>
            </div>
            {/* /Product Images */}
            {/* Product Info */}
            <div className="col-md-6">
              <div className="tf-zoom-main" />
              <div className="tf-product-info-wrap position-relative">
                <div className="tf-product-info-list other-image-zoom">
                  <ProductHeading item={item} price={item.price ?? defaultPlan?.price} />

                  <AddToCart
                    item={item}
                    kind={kind}
                    buyOncePrice={buyOncePrice}
                    highlightsPosition={pres.highlightsPosition}
                  />

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

                  {!accordionsBelow ? (
                    <SideAccordions
                      description={item.description}
                      sections={accordionSections}
                      ingredients={isPackage ? [] : (item.ingredients ?? [])}
                      coas={isPackage ? [] : (item.coas ?? [])}
                      includedProducts={isPackage ? (item.products ?? []) : []}
                      pairsWith={item.pairs_with ?? []}
                      pairWithPerView={pres.pairWith}
                    />
                  ) : null}
                </div>
              </div>
            </div>
            {/* /Product Info */}
          </div>

          {accordionsBelow ? (
            <div className="tf-product-below-accordions">
              <SideAccordions
                description={item.description}
                sections={accordionSections}
                ingredients={isPackage ? [] : (item.ingredients ?? [])}
                coas={isPackage ? [] : (item.coas ?? [])}
                includedProducts={isPackage ? (item.products ?? []) : []}
                pairsWith={item.pairs_with ?? []}
                pairWithPerView={pres.pairWith}
                idPrefix="below"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
