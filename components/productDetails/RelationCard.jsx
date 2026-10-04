import HealthGoalBadges from "@/components/catalog/HealthGoalBadges";
import { catalogCardPrice } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";
import { toPlainText } from "@/lib/richText";

/**
 * ONE card for the detail-page recommendation rails, whatever the item is.
 *
 * The rails carry a MIXED payload — `catalog_relations` an operator curated by
 * hand, products and packages together — and used to route by `type` into the
 * two listing cards. Those are different designs: a package rendered as a
 * white card with a title, price and button; a product as a bordered image
 * with its name underneath and no button at all. Side by side in one rail they
 * read as a broken page rather than a set of options.
 *
 * DELIBERATELY ITS OWN COMPONENT, not a variant of the listing cards. Those
 * are used by /products, /stacks and the cross-sell slider, all of which were
 * reworked and verified for mobile and must not move. The CMS `product-slider`
 * and `package-slider` sections carry their own card markup again, separately.
 * This card is for the detail-page rail alone, so changing it cannot reach any
 * other surface — which is the constraint the operator set.
 *
 * It reads the RELATION payload (CatalogRelationItemResource), which is
 * thinner than a listing payload — no `plans`, which is exactly why the
 * package card looked wrong here. A package prices itself, falling back to its
 * range when it is sold only through plans.
 *
 * The CTA label is hardcoded, and that is a known compromise rather than an
 * oversight: `product-slider` already has an admin `card_cta_label` field, and
 * this rail should get one too. Until it does, one neutral label for both
 * kinds — "Start my Semaglutide" is what routing by type would have produced.
 */

/**
 * Words of blurb a card shows before it is cut. Keeps rail heights even, and
 * is shorter than the listing cards' 25 because these cards are narrower and
 * carry a button and a badge row the listing cards do not.
 *
 * DELIBERATELY DUPLICATED from cards.jsx rather than extracted to a shared
 * helper. Deduping would mean editing that file, and the operator's constraint
 * on this work is that nothing here may affect the listing cards or the CMS
 * slider sections "in any manner". Twelve lines of pure function is a cheaper
 * price than a refactor reaching into a fenced-off, separately-verified
 * surface. If the fence ever comes down, merge them.
 */
const BLURB_WORDS = 16;

function blurb(text) {
  const plain = toPlainText(text);

  if (!plain) {
    return null;
  }

  const words = plain.trim().split(/\s+/);

  if (words.length <= BLURB_WORDS) {
    return plain.trim();
  }

  return `${words.slice(0, BLURB_WORDS).join(" ").replace(/[,;:.!?]+$/, "")}…`;
}

export default function RelationCard({ item }) {
  const href = item.type === "package" ? packageHref(item.slug) : productHref(item.slug);
  const price = catalogCardPrice(item);
  const description = blurb(item.short_description);

  return (
    <article className="rel-card">
      <a className="rel-card__media" href={href} tabIndex={-1} aria-hidden="true">
        {item.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.hero_image_url} alt="" loading="lazy" width={240} height={240} />
        ) : null}
      </a>

      <div className="rel-card__body">
        <a className="rel-card__title" href={href}>
          {item.name}
        </a>

        {price ? <p className="rel-card__price">{price}</p> : null}
        {description ? <p className="rel-card__blurb">{description}</p> : null}

        {/* One line only, and above the button — the operator's call. A card in
            a slider shares its height with every sibling, so a second row of
            chips would push the buttons out of line across the rail. */}
        <HealthGoalBadges goals={item.health_goals} className="hg-badges--rail" />

        {/* Every card in the rail has an identically-worded button, so the
            accessible name has to carry the item — a screen-reader user
            listing the links would otherwise hear "Get Started" four times
            with nothing to tell them apart. */}
        <a className="rel-card__cta" href={href} aria-label={`Get started with ${toPlainText(item.name)}`}>
          Get Started
        </a>
      </div>
    </article>
  );
}
