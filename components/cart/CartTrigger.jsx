"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

/**
 * Header cart button — count badge + opens the mini-cart drawer. Rendered at
 * every breakpoint. When the count increases the bag bumps (ct-bump scss
 * keyframes) — on viewports where the drawer doesn't auto-open this is the
 * add-to-cart feedback.
 */
export default function CartTrigger() {
  const { itemCount, openDrawer } = useCart();
  const [bumping, setBumping] = useState(false);
  const previousCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > previousCount.current) {
      setBumping(true);
      const timer = setTimeout(() => setBumping(false), 700);
      previousCount.current = itemCount;
      return () => clearTimeout(timer);
    }
    previousCount.current = itemCount;
    return undefined;
  }, [itemCount]);

  return (
    <button
      type="button"
      className={`ct-trigger${bumping ? " ct-bump" : ""}`}
      onClick={openDrawer}
      aria-label="Open cart"
    >
      <span className="icon icon-cart" aria-hidden="true" />
      {itemCount > 0 ? <span className="ct-count">{itemCount}</span> : null}
    </button>
  );
}
