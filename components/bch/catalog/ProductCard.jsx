import Link from "next/link";
import { catalogCardPrice, money } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";

/** Words of a card blurb before it is cut, so every card in a row carries the same amount of copy. */
const BLURB_WORDS = 18;

function blurb(text) {
  const words = typeof text === "string" ? text.trim().split(/\s+/).filter(Boolean) : [];

  if (!words.length) {
    return null;
  }

  return words.length <= BLURB_WORDS
    ? words.join(" ")
    : `${words.slice(0, BLURB_WORDS).join(" ").replace(/[,;:.!?]+$/, "")}…`;
}

/**
 * The product image, or a designed stand-in when there is none.
 *
 * The stand-in is deliberate rather than a broken box: BCH has no product
 * photography yet, and the concept renders in the client folder are marked
 * "never a sellable product card". An ivory tile with the submark reads as
 * "photo to come" in a review and on a live page alike.
 */
export function ProductImage({ item, className = "", sizes, priority = false, src = null }) {
  const url = src ?? item.hero_image_url;

  return (
    <span className={`bch-pimg ${className}`.trim()}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.name || ""}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          sizes={sizes}
        />
      ) : (
        <span className="bch-pimg__placeholder" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/bch-submark.svg" alt="" />
          <span>Photo coming</span>
        </span>
      )}
    </span>
  );
}

/**
 * Catalog card for the BCH shop, products and bundles alike.
 *
 * The price line is `catalogCardPrice`, the one rule every catalog card in this
 * app shares ("as low as" the cheapest way in). A card never adds to the bag:
 * when that figure is a plan, the visitor has to see the term before choosing
 * it, so the whole card links to the item's page.
 *
 * `variant`: "tile" (grid) or "row" (list layout: image left, copy right).
 */
export default function ProductCard({ item, kind = "product", variant = "tile", headingLevel = 3 }) {
  const href = kind === "package" ? packageHref(item.slug) : productHref(item.slug);
  const price = catalogCardPrice(item);
  const onSale = item.is_on_sale && item.price?.sale != null && item.price_from?.plan_id == null;
  const Title = `h${headingLevel}`;
  const goals = (item.health_goals ?? []).slice(0, 2);

  return (
    <article className={`bch-pcard bch-pcard--${variant}`}>
      <Link href={href} className="bch-pcard__media" tabIndex={-1} aria-hidden="true">
        <ProductImage item={item} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw" />
        {item.badge_text ? <span className="bch-pcard__badge">{item.badge_text}</span> : null}
      </Link>

      <div className="bch-pcard__body">
        {goals.length ? (
          <p className="bch-pcard__goals">{goals.map((goal) => goal.name).join(" · ")}</p>
        ) : null}
        <Title className="bch-pcard__title">
          <Link href={href}>{item.name}</Link>
        </Title>
        {variant === "row" ? (
          <>
            {item.subtitle ? <p className="bch-pcard__sub">{item.subtitle}</p> : null}
            {blurb(item.short_description) ? <p className="bch-pcard__blurb">{blurb(item.short_description)}</p> : null}
          </>
        ) : blurb(item.subtitle || item.short_description) ? (
          <p className="bch-pcard__blurb">{blurb(item.subtitle || item.short_description)}</p>
        ) : null}

        <div className="bch-pcard__foot">
          {price ? (
            <p className="bch-pcard__price">
              {price}
              {onSale && item.price?.retail != null ? <s>{money(item.price.retail)}</s> : null}
            </p>
          ) : null}
          {item.rx_required ? <p className="bch-pcard__flag">Clinician visit required</p> : null}
          {item.is_in_stock === false ? <p className="bch-pcard__flag">Out of stock</p> : null}
        </div>
      </div>
    </article>
  );
}
