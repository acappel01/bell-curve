import HealthGoalBadges from "@/components/catalog/HealthGoalBadges";
import { money } from "@/components/sections/support";

/**
 * Theme `productDetails/ProductHeading.jsx` fed by a catalog detail payload:
 * name, subtitle, badge_text, `price{retail,sale,effective,suffix}` on the
 * theme's price-new / price-old convention, and the in/out-of-stock state.
 * The theme's fake star rating + "(5 reviews)" block is not ported
 * (content-free rule — no demo reviews).
 */
export default function ProductHeading({ item, price }) {
  const resolvedPrice = price ?? item.price ?? {};
  const onSale = item.is_on_sale && resolvedPrice.sale != null;
  const inStock = item.is_in_stock !== false;

  return (
    <div className={`tf-product-heading ${inStock ? "" : "pb-0 border-0"}`}>
      <h3 className="product-name fw-heavy">{item.name}</h3>
      {item.subtitle ? <p className="text-md">{item.subtitle}</p> : null}
      {/* Both detail templates render through this component, so the badges
          land on the classic and conversion layouts from one place. A package
          gets them derived from the products inside it unless it overrides —
          that decision is the backend's; this only paints what it is sent. */}
      <HealthGoalBadges goals={item.health_goals} className="hg-badges--heading" />
      {resolvedPrice.effective != null ? (
        <div className="product-price">
          <div className="display-sm price-new price-on-sale">
            {money(resolvedPrice.effective)}
            {resolvedPrice.suffix || ""}
          </div>
          {onSale && resolvedPrice.retail != null ? (
            <div className="price-old">{money(resolvedPrice.retail)}</div>
          ) : null}
          {item.badge_text ? <span className="badge-sale">{item.badge_text}</span> : null}
        </div>
      ) : item.badge_text ? (
        <div className="product-price">
          <span className="badge-sale">{item.badge_text}</span>
        </div>
      ) : null}
      {/* `inventory_status_label` is the backend's display string; the bare
          `inventory_status` beside it is the machine-readable enum case and
          printing it put "in_stock" in the badge. The literal fallbacks stay
          because most records leave the field unset and a package never carries
          it at all — they are hard-rule-1 debt, and they clear when the two
          detail routes get a status the operator has actually chosen. */}
      {inStock ? (
        <div className="product-stock">
          <span className="stock in-stock">{item.inventory_status_label || "In Stock"}</span>
        </div>
      ) : (
        <>
          <div className="product-stock">
            <span className="stock out-stock">
              {item.inventory_status_label || "Out of Stock"}
            </span>
          </div>
          <button className="tf-btn btn-out-stock">
            This product is currently unavailable
          </button>
        </>
      )}
    </div>
  );
}
