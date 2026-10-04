import HealthGoalBadges from "@/components/catalog/HealthGoalBadges";
import { money } from "@/components/sections/support";
import { productHref } from "@/lib/routes";

/**
 * "What's Included" — the products inside a stack, one rounded card per row.
 *
 * Replaces the theme's `list-recent` mini list, which showed an image and a
 * price and read as a plain cross-sell rail. The point of these rows is the
 * opposite: they are things the visitor is NOT paying separately for, so the
 * price is struck through and labelled, and the stack reads as the better
 * deal.
 *
 * `/ea`, NEVER the item's own `price.suffix`. Five products in this catalog
 * store "/mo" because that is honest on their own detail page and listing
 * card — but a per-month suffix on a row inside a stack reads as an extra
 * subscription stacked on top of the one being bought. `/ea` reads as unit
 * value, which is what an included item has. The stored field is untouched;
 * this is a display decision belonging to this one context, exactly like the
 * "First month" / "Recurring" literals on the listing cards.
 *
 * Health-goal badges come from each product's own tags. A package embeds the
 * full ProductResource for its contents, but that is NOT enough on its own:
 * ProductResource only emits `health_goals` when the relation was eager-loaded,
 * so the package's show route has to load `products.healthGoals` as well as the
 * separate relation its own derived badges read. Miss it and these rows serve
 * empty arrays that look exactly like untagged products. Backend counterpart:
 * PackageController::show and docs/catalog/dev.md, "Health-goal badges".
 */
export default function IncludedItemList({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <ul className="inc-list">
      {items.map((item) => {
        const href = productHref(item.slug);
        const price = item.price ?? {};

        return (
          <li key={item.slug ?? item.id} className="inc-row">
            {item.hero_image_url ? (
              <a href={href} className="inc-media" tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" loading="lazy" src={item.hero_image_url} width={72} height={72} />
              </a>
            ) : (
              <span className="inc-media inc-media--empty" aria-hidden="true" />
            )}

            <div className="inc-body">
              <a href={href} className="inc-name">
                {item.name}
              </a>

              <HealthGoalBadges goals={item.health_goals} className="hg-badges--row" />

              {price.effective != null ? (
                <p className="inc-price">
                  <s className="inc-price__was">
                    {money(price.effective)}
                    <span className="inc-price__unit">/ea</span>
                  </s>
                  <span className="inc-price__badge">Included</span>
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
