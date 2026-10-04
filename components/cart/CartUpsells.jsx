"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { catalogCardPrice, cardQuotesAPlan } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";
import { fetchCartSuggestions } from "@/lib/checkoutClient";
import { useCart } from "./CartProvider";

/**
 * Upsell / cross-sell strip driven by GET /cart/suggestions — the backend
 * resolves admin-curated Pairs With / Related catalog relations for what's
 * in the cart, excludes in-cart items, and returns nothing when the admin
 * has upsells disabled, so this renders empty markup-free in every "off"
 * case. Used in the cart drawer and on the checkout sidebar.
 *
 * Add rules mirror QuickViewModal: products add directly (buy-once);
 * packages link through to their page — relation light cards don't carry
 * plans, and stacks need plan selection.
 */
export default function CartUpsells({ title = "Pairs well with", variant = "drawer" }) {
  const { cart, busy, addItem } = useCart();
  const [items, setItems] = useState([]);

  // Refetch when the cart's item mix changes (adds/removes), not on
  // quantity-only updates.
  const cartKey = (cart?.items ?? [])
    .map((line) => `${line.type}:${line.item?.id}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (!cartKey) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;
    fetchCartSuggestions().then((data) => {
      if (!cancelled) {
        setItems(Array.isArray(data) ? data : []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cartKey]);

  if (!items.length) {
    return null;
  }

  return (
    <div className={`cu-strip cu-${variant}`}>
      <p className="cu-title">{title}</p>
      <div className="cu-items">
        {items.map((item) => {
          const isProduct = item.type === "product";
          const href = isProduct ? productHref(item.slug) : packageHref(item.slug);
          // The same rule the listing, rail, Pair With and quick-view surfaces
          // use — this strip is served by `CatalogRelationItemResource` like
          // they are, so a package must not quote a different figure here than
          // on the card the visitor just came from. It reaches the cart drawer
          // and the checkout sidebar, the two highest-intent screens there are.
          const price = catalogCardPrice(item);

          return (
            <div className="cu-card" key={`${item.type}-${item.slug}`}>
              <Link href={href} className="cu-cardMedia" aria-label={item.name}>
                {item.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={item.hero_image_url} alt={item.name || ""} width={64} height={64} />
                ) : null}
              </Link>
              <div className="cu-cardInfo">
                <Link href={href} className="cu-cardName link">
                  {item.name}
                </Link>
                {price ? <span className="cu-cardPrice">{price}</span> : null}
              </div>
              {isProduct && !cardQuotesAPlan(item) ? (
                <button
                  type="button"
                  className="cu-cardAdd"
                  disabled={busy || item.is_in_stock === false}
                  onClick={() => addItem({ type: "product", id: item.id })}
                  aria-label={`Add ${item.name} to cart`}
                >
                  +
                </button>
              ) : (
                <Link href={href} className="cu-cardAdd cu-cardView" aria-label={`View ${item.name}`}>
                  →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
