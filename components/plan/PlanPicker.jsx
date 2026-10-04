"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DealGrid from "@/components/productDetails/DealGrid";
import { useCart } from "@/components/cart/CartProvider";
import { catalogCardPrice, money } from "@/components/sections/support";

/**
 * Pick a term without leaving the report — the card CTA plus the modal behind
 * it, on `/plan/{uuid}`.
 *
 * THIS REPLACES A LINK OUT, AND THAT IS THE WHOLE POINT. A card quoting "as low
 * as $X" may not add in one tap when X came from a plan: passing the plan
 * through books a rebill the visitor never chose, and omitting it charges more
 * than the card just said. Until now the remedy was to send them to the item's
 * own page to choose — correct, and the place a funnel loses the person who has
 * just answered ten questions. The modal is the same choice made in place, so
 * the honesty rule (`cardQuotesAPlan`) is satisfied by asking rather than by
 * leaving.
 *
 * IT OPENS ON `price_from.plan_id`, NOT ON THE DEFAULT PLAN. That id names the
 * source of the figure printed on the card two inches above it, so opening on
 * it means the preselected option and the quoted price are the same purchase.
 * Opening on `is_default` would show a term the card never quoted and turn one
 * confirming tap into a different, usually higher, charge. `null` is the other
 * honest answer, not a missing one: the figure was the item's own price, so
 * buy-once is preselected. Backend contract: `prx-backend/docs/frontend/dev.md`
 * — "it is what a plan picker opens on".
 *
 * THE PLANS COME DOWN WITH THE REPORT. `/plan/{uuid}` is a server render and
 * this is a leaf of it, so the terms arrive as props from the payload the page
 * already fetched. Nothing here fetches content — the rule that keeps API
 * credentials and content reads on the server. `PlanReport` therefore only
 * mounts this component when the plans are actually present, rather than
 * assuming a kind implies them; a package carries them on this endpoint and a
 * product does not.
 *
 * NO QUANTITY STEPPER, unlike the detail page's buy box. A plan already says how
 * much arrives and how often, and the report's job is one considered selection
 * per goal rather than a bulk order — the item's own page still has the stepper
 * for a visitor who wants two.
 *
 * The labels here are hardcoded English, in the same recorded debt class as the
 * card CTAs and `PlanAddToCart`'s status lines. Making UI microcopy
 * admin-authored is one decision for the whole site, not a thing to start
 * halfway through in a modal.
 */
export default function PlanPicker({ type, item, href, label = "Choose a plan" }) {
  const { addItem, busy } = useCart();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  // The figure's own plan, so the modal opens on what the card quoted. `null`
  // is a real selection — the item itself, once, at its own price.
  //
  // AND IT MUST BE SOMETHING THE GRID ACTUALLY OFFERS. `null` IS the buy-once
  // option, and `DealGrid` renders that line only when the item has an own
  // price — so for a package sold through its plans alone, opening on `null`
  // would leave nothing marked, the confirm button naming no price, and one tap
  // adding at a price that does not exist. `price_from.plan_id` already covers
  // that shape on any coherent payload (with no own price the figure can only
  // have come from a plan); this is the floor under it, not a second opinion.
  const [planId, setPlanId] = useState(
    item.price_from?.plan_id ?? (item.price?.effective == null ? (item.plans?.[0]?.id ?? null) : null),
  );
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);

  const triggerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    // Focus goes back where it came from rather than to the top of the
    // document — a keyboard visitor who dismisses the modal is still on the
    // card they opened it from.
    triggerRef.current?.focus();
  }, []);

  async function confirm() {
    setError(null);
    setAdding(true);

    try {
      await addItem({ type, id: item.id, planId });
      setAdded(true);
      // `close()`, not `setOpen(false)`: a success dismisses the modal exactly
      // as Escape and the backdrop do, so focus returns to the trigger rather
      // than being dropped on the confirm button that just unmounted.
      close();
    } catch (e) {
      // Shown in the modal rather than thrown: the visitor is at the end of a
      // funnel and a control that silently does nothing reads as a broken page.
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="plan-card__cta">
      <button
        type="button"
        ref={triggerRef}
        className="tf-btn btn-fill plan-card__add"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {added ? "Added to cart" : label}
      </button>

      {open ? (
        <PlanPickerModal
          item={item}
          href={href}
          planId={planId}
          onSelect={setPlanId}
          onConfirm={confirm}
          onClose={close}
          busy={busy || adding}
          error={error}
        />
      ) : null}
    </div>
  );
}

/**
 * The modal itself.
 *
 * WEARS THE QUICK-VIEW CHROME (`pw-qv*`) RATHER THAN A NEW ONE. That chrome is
 * already a portaled, width-agnostic panel with a media column and an info
 * column, which is exactly this shape, and reusing it means no new CSS to keep
 * in sync with the modal it would otherwise be a near-copy of. Same reasoning
 * that kept the card CTA in `plan-card__cta`.
 *
 * PORTALED TO `<body>` for the reason the quick view is: an ancestor with a
 * filter or a transform becomes the containing block for `position: fixed` and
 * would trap the overlay inside the report's column.
 *
 * NO PRODUCT SHOT, THOUGH THE CHROME HAS A SLOT FOR ONE. The quick view is a
 * look at an item and its image is the content; this is a term chooser opened
 * from a card the visitor is already looking at, so the image is decoration —
 * and on a phone the bottom sheet gave it half the height and pushed both the
 * terms and the confirm button below the fold. That is the 80% case on this
 * site. Dropping it also lets the deal grid have the full panel width at
 * desktop, where three terms then sit on one row instead of two-plus-one.
 * Measured at 390 and 1440 in WebKit and Chromium.
 */
function PlanPickerModal({ item, href, planId, onSelect, onConfirm, onClose, busy, error }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // The same figure the card leads with, repeated here because the modal is one
  // tap from the card and the two disagreeing about the same item is the defect
  // the shared rule exists to have ended. It is a floor, and the grid below is
  // where it is actually chosen.
  const cardPrice = catalogCardPrice(item);

  // THE CONFIRM BUTTON NAMES WHAT IT WILL CHARGE.
  //
  // The grid marks a chosen plan with a border and the buy-once line with an
  // underline — enough beside a buy box, not enough here: `pd-popularBadge`
  // renders on the DEFAULT plan while the border marks the SELECTED one, so a
  // stack whose figure is its own price opens with "Most Popular" sitting on a
  // term nobody has chosen. A visitor reading the badge and pressing the button
  // would be one tap from a purchase they did not pick. The price on the button
  // is the unambiguous answer, and it costs no CSS.
  //
  // The suffix is the operator's, verbatim, exactly as the grid and every card
  // render it — this must not become a second place that decides how a price
  // reads.
  const chosen = item.plans?.find((plan) => plan.id === planId) ?? null;
  const chosenPrice = planId === null ? money(item.price?.effective) : money(chosen?.price?.effective);
  const chosenSuffix = (planId === null ? item.price?.suffix : chosen?.price?.suffix) || "";

  return createPortal(
    <div
      className="pw-qv"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
    >
      <div className="pw-qvPanel" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          ref={closeRef}
          className="pw-qvClose icon-close"
          onClick={onClose}
          aria-label="Close"
        />

        <div className="pw-qvInfo">
          <h5 className="pw-qvTitle">{item.name}</h5>
          {cardPrice ? <p className="pw-qvPrice">{cardPrice}</p> : null}

          <DealGrid
            plans={item.plans}
            selectedPlanId={planId}
            onSelect={onSelect}
            // The item's own price, and the reason buy-once is offered at all:
            // a stack is a set of products bought once, and a plan is the
            // separate recurring commitment over the same bundle.
            buyOncePrice={item.price?.effective ?? null}
          />

          <div className="pw-qvActions">
            <button
              type="button"
              className="tf-btn pw-qvCta"
              // Cart-wide: two adds in flight against one cart row is a race,
              // and the second would overwrite the first's response.
              disabled={busy}
              onClick={onConfirm}
            >
              {chosenPrice ? `Add to cart — ${chosenPrice}${chosenSuffix}` : "Add to cart"}
            </button>

            {error ? (
              <p className="pw-qvError" role="alert">
                {error}
              </p>
            ) : null}

            {/* The modal covers the card's title and image, which were the
                only route to the item's own page. A visitor who opened this to
                compare terms and finds they want the full description must not
                have to dismiss it to guess where that lives. */}
            <a className="pw-qvDetailsLink link" href={href}>
              View full details
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
