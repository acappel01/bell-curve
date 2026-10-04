"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

/**
 * Add one matched PRODUCT to the cart, from the plan report.
 *
 * One of two client leaves on `/plan/{uuid}` — `PlanPicker` is the other. The
 * report itself is a server render and this is pushed as far down the tree as
 * it goes: one button, no data fetching. It reads the cart through `useCart()`
 * rather than calling `addCartItem` directly so the bag count, the drawer and
 * the checkout sidebar all update from the one source of truth.
 *
 * THIS IS THE ONE-TAP CASE, AND ONLY IT. The report is the conversion surface
 * at the end of the funnel, so an item whose quoted figure is its OWN price
 * adds without ceremony and several can reach the bag in a row.
 *
 * An item whose figure came from a PLAN cannot: the card says "as low as $X",
 * and X is a rate the visitor only pays by taking on a rebill they have not
 * agreed to. Passing the plan through signs them up; omitting it charges the
 * item's own, higher price under a card quoting the lower one. PlanReport sends
 * those to `PlanPicker` — `cardQuotesAPlan` is the test, and it asks about the
 * payload rather than the kind.
 *
 * Stacks never reach this component at all, for a second and independent
 * reason: the operator wants a term chosen deliberately even when the stack's
 * figure is its own price and an add would be honest. That is now a modal on
 * this page rather than a trip to the stack's own page.
 *
 * `planId` is therefore null on every add this component performs, and stays in
 * the signature because a caller that has a plan must be able to say so —
 * `PlanPicker` passes the one the visitor chose.
 *
 * WHAT THE PLAN DOES **NOT** FIX, stated because the opposite was written here
 * first and would have misled the session that picks up the prx catalog mapping:
 * `SubmitPrescribeRxCheckoutAction` snapshots `provider_product_sku` off the
 * itemable UNCONDITIONALLY, so a package line still records a null SKU whether
 * or not it carries a plan. There is no branch to avoid.
 *
 * What a plan DOES change is `resolveProductIds`: a plan-carrying line resolves
 * the provider handoff through `plan->provider_product_ids` instead of the
 * package's component products. **With zero plans mapped today that resolves to
 * nothing**, where a plan-less package would at least contribute its components'
 * ids — so this makes the prx handoff for stacks strictly MORE dependent on the
 * plan mapping landing. That path is dark (`prescribe_rx_enabled` is false and
 * no plan carries an id), and a visible price lie beats a latent one in a
 * disabled integration — but it is a real cost of this trade, not a bonus.
 *
 * The item's own page remains one tap away through the card's title and image.
 *
 * A FAILED ADD SAYS SO. The cart is a network call and the visitor is at the
 * end of a funnel; a button that silently does nothing on a dropped request
 * reads as a broken page and loses the conversion this report exists to
 * produce. The error is shown in place rather than thrown, because a thrown one
 * here would blank the entire report over one unavailable item.
 */
export default function PlanAddToCart({ type, id, planId = null, label }) {
  const { addItem, busy } = useCart();
  const [state, setState] = useState("idle");

  async function add() {
    setState("adding");

    try {
      await addItem({ type, id, planId });
      setState("added");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="plan-card__cta">
      <button
        type="button"
        className="tf-btn btn-fill plan-card__add"
        onClick={add}
        // `busy` is cart-wide: two adds in flight against one cart row is a
        // race, and the second would overwrite the first's response.
        disabled={busy || state === "adding"}
      >
        {state === "added" ? "Added to cart" : label}
      </button>

      {state === "failed" ? (
        <p className="plan-card__error" role="alert">
          That didn&rsquo;t go through. Please try again.
        </p>
      ) : null}
    </div>
  );
}
