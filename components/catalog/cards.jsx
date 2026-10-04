import HealthGoalBadges from "@/components/catalog/HealthGoalBadges";
import { catalogCardPrice, money } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";

/**
 * Catalog listing cards, fed from /api/v1/catalog responses.
 *
 * ProductListingCard = theme ProductCard6 markup ("card-product style-4",
 * same adaptation as ProductSliderSection) plus the theme's `price-wrap`
 * new/old price line — the theme ships no priced listing card, so the price
 * markup follows its cart/product price convention.
 *
 * PackageListingCard = theme productCards/ProductCard.jsx ("ps-card", the
 * stacks listing card) with the hardcoded demo pricing replaced by a single
 * "As low as $X" line, shared with the recommendation rail, the Pair With
 * slider and the product card above via `catalogCardPrice` — the cheapest way
 * into the stack across its own one-time price and its monthly plans, with the
 * term chosen on its own page. It no longer matches PackageSliderSection,
 * which still shows a First month / Recurring pair under operator-authored
 * labels — that surface was deliberately left alone.
 */

/** Words shown of a listing card's blurb before it is cut. */
const BLURB_WORDS = 25;

/**
 * Trim authored copy to a word budget, for a card whose height is shared with
 * its neighbours in a grid row.
 *
 * A WORD CAP RATHER THAN A LINE CLAMP, because the operator asked for one and
 * because the two answer different questions: `line-clamp` hides the overflow
 * at whatever width the card happens to be, so the same stack shows three lines
 * on a phone and one on a desktop and the copy nobody sees is still shipped and
 * still paid for in bytes. Cutting by words gives every card the same amount of
 * text at every width.
 *
 * Takes plain text — these blurbs are `short_description`, an inline field, and
 * cutting markup by words would split a tag down the middle.
 */
function blurb(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return null;
  }

  const words = text.trim().split(/\s+/);

  if (words.length <= BLURB_WORDS) {
    return text.trim();
  }

  // The ellipsis replaces any trailing punctuation the cut landed on, so the
  // result never reads "energy,…".
  return `${words.slice(0, BLURB_WORDS).join(" ").replace(/[,;:.!?]+$/, "")}…`;
}

export function ProductListingCard({ product }) {
  const href = productHref(product.slug);
  const imgSrc = product.hero_image_url;
  const imgHover = product.gallery?.[0] || imgSrc;
  const price = product.price ?? {};

  // THE SAME ONE RULE THE STACK CARDS USE. A product carries `price_from` now,
  // so the figure is the cheapest way in across its own price and any monthly
  // plan — today that is always its own price, because no product has a
  // monthly plan, and the day one does this card follows without another edit.
  const cardPrice = catalogCardPrice(product);

  // THE STRUCK-THROUGH RETAIL ONLY BELONGS BESIDE THE PRODUCT'S OWN PRICE.
  // When the figure comes from a plan (`plan_id` set), the item's retail is a
  // different purchase entirely, and showing it struck through next to a
  // monthly rate invents a discount that was never offered.
  const onSale =
    product.is_on_sale && price.sale != null && product.price_from?.plan_id == null;

  return (
    <div className="card-product style-4">
      <div className="card-product-wrapper radius-16 line-2 asp-ratio-0">
        <a href={href} className="product-img">
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              loading="lazy"
              className="img-product"
              alt={product.name || ""}
              src={imgSrc}
              width={172}
              height={344}
            />
          ) : null}
          {imgHover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              loading="lazy"
              className="img-hover"
              alt={product.name || ""}
              src={imgHover}
              width={172}
              height={344}
            />
          ) : null}
        </a>
      </div>
      <div className="card-product-info">
        <a href={href} className="name-product link fw-medium text-md">
          {product.name}
        </a>
        <HealthGoalBadges goals={product.health_goals} className="hg-badges--card" />
        {blurb(product.short_description) ? <p>{blurb(product.short_description)}</p> : null}
        {cardPrice ? (
          <p className="price-wrap fw-medium">
            <span className="new-price">{cardPrice}</span>{" "}
            {onSale && price.retail != null ? (
              <span className="old-price">{money(price.retail)}</span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PackageListingCard({ pkg }) {
  const href = packageHref(pkg.slug);

  // One shared rule with the recommendation rail and the Pair With slider —
  // see `catalogCardPrice`. It replaced a "First month / Recurring" pair read
  // off the default plan, and leaves the intro price behind deliberately: that
  // price buys one billing cycle, so the detail page's plan picker is where it
  // belongs, not a card.
  const price = catalogCardPrice(pkg);

  return (
    <div>
      <article className="ps-card">
        <div className="ps-cardHeader">
          <div className="ps-cardHeading">
            <h3 className="ps-cardTitle">{pkg.name}</h3>
            <div className="ps-cardPricing">
              {price ? <p className="ps-priceFrom">{price}</p> : null}
            </div>
          </div>
          {pkg.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ps-cardImage" src={pkg.hero_image_url} alt="" aria-hidden="true" />
          ) : null}
        </div>
        {blurb(pkg.short_description) ? (
          <p className="ps-cardDescription">{blurb(pkg.short_description)}</p>
        ) : null}
        <HealthGoalBadges goals={pkg.health_goals} className="hg-badges--card" />
        <a className="ps-cardButton" href={href}>
          Start my {pkg.name}
        </a>
      </article>
    </div>
  );
}
