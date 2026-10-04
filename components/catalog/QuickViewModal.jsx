"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { catalogCardPrice, cardQuotesAPlan, money } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";
import { useCart } from "@/components/cart/CartProvider";

/**
 * Quick-view modal for catalog light cards (the related / pairs_with item
 * shape from CatalogRelationItemResource: type, name, slug, subtitle,
 * badge_text, hero_image_url, is_in_stock, price{}, price_from{}).
 *
 * Controlled: renders only while `item` is set; the opener owns the state.
 * Portaled to <body> — ancestors with backdrop-filter become the containing
 * block for position:fixed and would trap the overlay inside the accordion
 * column.
 *
 * Product CTAs add straight to the cart (buy-once; term-plan selection
 * lives on the detail page). Package CTAs stay links — a stack needs its
 * plan chosen on its own page.
 */
export default function QuickViewModal({ item, onClose }) {
  const closeRef = useRef(null);
  const { addItem, busy } = useCart();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!item) {
      return undefined;
    }

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
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  const isPackage = item.type === "package";
  const href = isPackage ? packageHref(item.slug) : productHref(item.slug);
  const price = item.price ?? {};
  const onSale = price.sale != null && price.retail != null && price.sale < price.retail;

  // A PACKAGE QUOTES THE SAME FIGURE AS THE CARD THAT OPENED THIS. The modal is
  // one tap from the card, so a stack reading one number on the card and another
  // here is the same stack contradicting itself — which is exactly what happened
  // when the shared rule reached the cards and not the modal. It read
  // "From $349.00/mo" there against "$399.00/mo" here; both surfaces now go
  // through `catalogCardPrice` and neither invents its own figure.
  // BOTH KINDS NOW, because a product carries `price_from` too. The struck
  // retail stays for products, and only when the figure is the product's own
  // price — beside a plan's monthly rate it would invent a discount.
  const cardPrice = catalogCardPrice(item);
  const showWasPrice =
    !isPackage && onSale && price.retail != null && item.price_from?.plan_id == null;

  return createPortal(
    <div className="pw-qv" role="dialog" aria-modal="true" aria-label={item.name} onClick={onClose}>
      <div className="pw-qvPanel" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          ref={closeRef}
          className="pw-qvClose icon-close"
          onClick={onClose}
          aria-label="Close quick view"
        />
        {item.hero_image_url ? (
          <div className="pw-qvMedia">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.hero_image_url} alt={item.name || ""} width={552} height={552} />
          </div>
        ) : null}
        <div className="pw-qvInfo">
          <p className="pw-qvKind">{isPackage ? "Stack" : "Product"}</p>
          <h5 className="pw-qvTitle">{item.name}</h5>
          {item.subtitle ? <p className="pw-qvSubtitle">{item.subtitle}</p> : null}
          {cardPrice ? (
            <p className="pw-qvPrice">
              <span className="new-price">{cardPrice}</span>{" "}
              {showWasPrice ? <span className="old-price">{money(price.retail)}</span> : null}
            </p>
          ) : null}
          {item.is_in_stock === false ? <p className="pw-qvStock">Currently unavailable</p> : null}
          <div className="pw-qvActions">
            {/* A PLAN-QUOTING CARD SENDS THEM TO PICK ONE. Adding here would
                either book a rebill the visitor never chose or charge the
                item's own price under a card quoting a plan's rate — see
                `cardQuotesAPlan`. Stacks always take this branch today. */}
            {isPackage || cardQuotesAPlan(item) ? (
              <a className="tf-btn pw-qvCta" href={href}>
                {isPackage ? "View Stack" : "Choose a plan"}
              </a>
            ) : (
              <button
                type="button"
                className="tf-btn pw-qvCta"
                disabled={busy || item.is_in_stock === false}
                onClick={() => {
                  setError(null);
                  addItem({ type: "product", id: item.id })
                    .then(onClose)
                    .catch((e) => setError(e.message));
                }}
              >
                {item.is_in_stock === false ? "Out of Stock" : "Add to Stack"}
              </button>
            )}
            {error ? <p className="pw-qvError">{error}</p> : null}
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
