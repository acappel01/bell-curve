"use client";

import { useEffect, useState } from "react";
import { money } from "@/components/sections/support";
import { useCart } from "@/components/cart/CartProvider";

/**
 * Mobile sticky add-to-cart bar (V-Conversion). Fixed to the viewport
 * bottom below 768px; appears only after the main buy box has scrolled
 * out of view (IntersectionObserver on `watch`) so it never doubles the
 * visible CTA. Adds the default selection — packages their default plan,
 * products buy-once — matching the buy box's initial state.
 */
export default function StickyCta({ item, kind, watch = "#pd-buybox" }) {
  const { addItem, busy } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.querySelector(watch);

    if (!target) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);

    return () => observer.disconnect();
  }, [watch]);

  if (item.is_in_stock === false) {
    return null;
  }

  const isPackage = kind === "package";
  const defaultPlan = isPackage
    ? ((item.plans ?? []).find((plan) => plan.is_default) ?? (item.plans ?? [])[0])
    : null;
  // THE ITEM'S OWN PRICE LEADS, for a package as much as a product — it is what
  // the detail page is selling, and a plan is the alternative offered beside it.
  // This read the default plan first for packages, which was the only sensible
  // answer while a package's own price was emitted nowhere.
  const price = item.price ?? defaultPlan?.price;

  const add = () =>
    addItem({
      type: kind,
      id: item.id,
      planId: defaultPlan?.id ?? null,
      quantity: 1,
    }).catch(() => {});

  return (
    <div className={`pd-stickyCta${visible ? " is-visible" : ""}`}>
      <div className="pd-stickyCta__info">
        <span className="pd-stickyCta__name">{item.name}</span>
        {price?.effective != null ? (
          <span className="pd-stickyCta__price">
            {money(price.effective)}
            {price.suffix || ""}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="tf-btn pd-stickyCta__btn"
        onClick={add}
        disabled={busy}
      >
        Add to Cart
      </button>
    </div>
  );
}
