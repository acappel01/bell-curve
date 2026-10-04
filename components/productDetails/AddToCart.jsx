"use client";

import { useState } from "react";
import DealGrid from "./DealGrid";
import ProductHighlights from "./ProductHighlights";
import { useCart } from "@/components/cart/CartProvider";

/**
 * Detail-page buy box — the interactive half of the Figma V1 info column.
 * When the record has plans, the pd-deal grid becomes selectable (radio
 * semantics), with the "Or buy once" line part of the same selection group.
 * Add to Cart goes through CartProvider.
 *
 * BOTH KINDS DEFAULT TO BUYING THE ITEM ITSELF. Packages used to preselect
 * their default plan and offer no buy-once line at all, which — together with
 * the API requiring `plan_id` for packages — meant a stack could only be bought
 * as a subscription. Quantity applies to the item, never to a plan.
 *
 * THE TERM CHOOSER IS `DealGrid` AND IS NO LONGER THIS FILE'S. The plan report
 * offers the same choice in a modal, and two implementations of the grid a
 * visitor compares prices in is the shape of defect this project has already
 * paid for on the card figure. The DOM here is unchanged by the extraction —
 * including the `pd-deal-grid` id, which is now passed rather than assumed,
 * because the modal must not emit a second element carrying it.
 */
export default function AddToCart({ item, kind, buyOncePrice = null, highlightsPosition = "above" }) {
  const { addItem, busy } = useCart();
  const plans = item.plans ?? [];

  // NOTHING IS PRESELECTED FOR A PACKAGE ANY MORE.
  //
  // A package used to arrive with its default plan chosen, and the API required
  // `plan_id` for packages — so a stack could only ever be bought as a
  // subscription and there was no way to buy the thing itself. A package IS a
  // product, or a group of them, with its own price; plans are the separate
  // recurring offer alongside it.
  //
  // So the item itself is the default for both kinds, and choosing a plan is a
  // deliberate act. `null` means "the package or product, once, at its own
  // price" — which is exactly what the cart endpoint now accepts.
  const [planId, setPlanId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);

  // QUANTITY BELONGS TO THE ITEM, NOT THE SUBSCRIPTION. A plan already says how
  // much arrives and how often, so a quantity stepper beside it invites "2 x
  // monthly plan", which means nothing an operator could fulfil. Hidden rather
  // than disabled: a control you cannot use still asks to be understood.
  const showQuantity = planId === null;

  const add = () => {
    setError(null);
    addItem({ type: kind, id: item.id, planId, quantity: showQuantity ? quantity : 1 }).catch((e) => setError(e.message));
  };

  return (
    <div className="pd-buyBox">
      <DealGrid
        id="pd-deal-grid"
        plans={plans}
        selectedPlanId={planId}
        onSelect={setPlanId}
        buyOncePrice={buyOncePrice}
      />

      {/* The reassurance strip — "Fast & free shipping", "100-day money-back
          guarantee". Real storefronts put it on both sides of the button, so
          this is a knob rather than a decision made here; `none` hides the
          lines without the operator having to delete them. */}
      {highlightsPosition === "above" ? <ProductHighlights highlights={item.highlights} /> : null}

      <div className="pd-buyRow">
        {showQuantity ? (
        <div className="wg-quantity pd-qty">
          <button
            type="button"
            className="btn-quantity minus-btn"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input type="text" className="quantity-product" value={quantity} readOnly />
          <button
            type="button"
            className="btn-quantity plus-btn"
            disabled={quantity >= 10}
            onClick={() => setQuantity((q) => Math.min(10, q + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        ) : null}
        <button
          type="button"
          className="tf-btn pd-addBtn"
          disabled={busy || item.is_in_stock === false}
          onClick={add}
        >
          {item.is_in_stock === false ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
      {error ? <p className="pd-buyError">{error}</p> : null}
      {highlightsPosition === "below" ? <ProductHighlights highlights={item.highlights} /> : null}
    </div>
  );
}
