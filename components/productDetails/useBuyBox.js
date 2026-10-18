"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

/**
 * The state and add-to-cart behaviour of a detail-page buy box, shared by the
 * Atlas `AddToCart` and the Bell Curve purchase options.
 *
 * `planId === null` MEANS THE ITEM ITSELF, bought once at its own price, and it
 * is the default for both kinds: choosing a plan is a deliberate act. Quantity
 * belongs to the item, never a plan — a plan already says how much arrives and
 * how often — so it is forced to 1 whenever a plan is chosen.
 *
 * `preview` (fixture content) keeps every control usable and adds nothing,
 * because there is no cart to add to.
 */
export default function useBuyBox({ item, kind, preview = false }) {
  const { addItem, busy } = useCart();
  const [planId, setPlanId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const showQuantity = planId === null;
  const outOfStock = item.is_in_stock === false;

  const add = () => {
    setError(null);

    if (preview) {
      setNotice("Preview only. Adding to your bag works once the shop opens.");
      return;
    }

    addItem({ type: kind, id: item.id, planId, quantity: showQuantity ? quantity : 1 }).catch((e) =>
      setError(e.message),
    );
  };

  return {
    planId,
    setPlanId,
    quantity,
    setQuantity,
    showQuantity,
    outOfStock,
    busy,
    error,
    notice,
    add,
  };
}
