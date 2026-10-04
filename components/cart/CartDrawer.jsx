"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { money } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";
import { useCart } from "./CartProvider";
import CartUpsells from "./CartUpsells";

/** Detail route for a cart line's underlying catalog item. */
function itemHref(line) {
  const slug = line.item?.slug;

  if (!slug) {
    return "#";
  }

  return line.type === "Package" ? packageHref(slug) : productHref(slug);
}

/**
 * Mini-cart offcanvas — the theme's #shoppingCart popup (popup-style-1 /
 * tf-mini-cart-* classes) driven by React state from CartProvider instead
 * of Bootstrap's data-API, because its contents re-render from live cart
 * data. Portaled to <body>. The demo threshold/progress block is dropped;
 * checkout buttons arrive with the checkout milestone.
 */
export default function CartDrawer() {
  const { cart, busy, drawerOpen, closeDrawer, updateItem, removeItem } = useCart();

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) {
    return null;
  }

  const items = cart?.items ?? [];

  return createPortal(
    <>
      <div className="cd-backdrop" onClick={closeDrawer} />
      <div className="offcanvas offcanvas-end popup-style-1 popup-shopping-cart show cd-drawer" tabIndex={-1}>
        <div className="canvas-wrapper">
          <div className="popup-header">
            <span className="title">Shopping cart</span>
            <button
              type="button"
              className="icon-close icon-close-popup cd-close"
              onClick={closeDrawer}
              aria-label="Close cart"
            />
          </div>
          <div className="wrap cd-body">
            {items.length ? (
              <div className="tf-mini-cart-items">
                {items.map((line) => (
                  <div className="tf-mini-cart-item cd-item" key={line.id}>
                    <div className="tf-mini-cart-image">
                      {line.item?.hero_image_url ? (
                        <a href={itemHref(line)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={line.item.hero_image_url} alt={line.item?.name || ""} width={80} height={80} />
                        </a>
                      ) : null}
                    </div>
                    <div className="tf-mini-cart-info cd-itemInfo">
                      <a className="title link text-md fw-medium" href={itemHref(line)}>
                        {line.item?.name}
                      </a>
                      {line.plan ? <p className="cd-planName">{line.plan.name}</p> : null}
                      <div className="cd-lineMeta">
                        <div className="wg-quantity small cd-qty">
                          <button
                            type="button"
                            className="btn-quantity minus-btn"
                            disabled={busy}
                            onClick={() => updateItem(line.id, line.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <input type="text" className="quantity-product" value={line.quantity} readOnly />
                          <button
                            type="button"
                            className="btn-quantity plus-btn"
                            disabled={busy || line.quantity >= 10}
                            onClick={() => updateItem(line.id, line.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="cd-lineTotal fw-medium">
                          {line.line_total != null ? money(line.line_total) : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="cd-remove link"
                        disabled={busy}
                        onClick={() => removeItem(line.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="cd-empty">Your cart is empty.</p>
            )}
          </div>
          <div className="cd-footer">
            <CartUpsells />
            <div className="cd-subtotal">
              <span>Subtotal</span>
              <span className="fw-medium">{money(cart?.subtotal ?? 0)}</span>
            </div>
            {items.length ? (
              <Link
                href="/checkout"
                className="tf-btn btn-dark2 animate-btn w-100 cd-checkoutBtn"
                onClick={closeDrawer}
              >
                Checkout
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
