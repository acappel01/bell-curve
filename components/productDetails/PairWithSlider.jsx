"use client";

import { useState } from "react";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import QuickViewModal from "@/components/catalog/QuickViewModal";
import { catalogCardPrice, cardQuotesAPlan } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";
import { useCart } from "@/components/cart/CartProvider";

/**
 * Pair With mini slider — replaces the static mini list inside the Pair
 * With accordion. Cards open the catalog QuickViewModal instead of
 * navigating; the modal's CTA is the link out (link-first until Cart).
 *
 * Per-view counts are per-placement presentation props (builder-ready):
 * desktop 1–4, mobile 1–2. The 768px breakpoint mirrors the col-md-6
 * detail-page column split. observer/observeParents are required — the
 * slider mounts inside a Bootstrap collapse (display:none) and must
 * re-measure when the accordion opens.
 *
 * THE QUICK-VIEW BUTTON AND THE CTA ARE SIBLINGS, NOT NESTED. The card used
 * to be one `role="button"` wrapper; putting the add-to-cart control inside
 * that would nest one control in another, which is invalid and leaves the
 * inner one unreachable to a screen reader. The quick-view trigger is now a
 * transparent button filling the WHOLE card, and the CTA sits above it on a
 * higher layer — one click target each, both keyboard-reachable.
 *
 * It covers the whole card rather than just the media because it replaced a
 * wrapper that did: scoped to the image, a tap on the product NAME would do
 * nothing, and on touch — most of this site's traffic — tapping the name is
 * how people open a card. The name and price stay plain text so a screen
 * reader is not offered two controls that do the same thing.
 *
 * The four CTA/state labels below are hardcoded English, matching the strings
 * QuickViewModal already ships. That is known debt against hard rule 1, not an
 * oversight: it clears when card labels become an admin field, and all the
 * copies want moving together.
 *
 * A PACKAGE IS A LINK, NOT AN ADD. Same rule the quick-view modal states: a
 * stack needs its plan chosen on its own page, so adding one straight from a
 * card would commit the visitor to a plan nobody picked.
 */
export default function PairWithSlider({
  items = [],
  desktopPerView = 2,
  mobilePerView = 1,
  idSuffix = "pw",
}) {
  const [quickViewItem, setQuickViewItem] = useState(null);
  const [errorKey, setErrorKey] = useState(null);
  const { addItem, busy } = useCart();

  if (!items.length) {
    return null;
  }

  const paginationClass = `sw-pagination-${idSuffix}`;

  const openQuickView = (item) => setQuickViewItem(item);

  // Keyed by type AND slug, the same identity the list is keyed by: products
  // and packages are separate tables, so a slug alone can name two rows and
  // would print a failed add on the other one's card.
  const itemKey = (item) => `${item.type ?? "product"}-${item.slug}`;

  const addToCart = (item) => {
    setErrorKey(null);
    addItem({ type: "product", id: item.id }).catch(() => setErrorKey(itemKey(item)));
  };

  return (
    <div className="pw-slider">
      <Swiper
        dir="ltr"
        className="swiper tf-swiper"
        modules={[Pagination]}
        slidesPerView={mobilePerView}
        spaceBetween={12}
        speed={600}
        grabCursor
        observer
        observeParents
        pagination={{ el: `.${paginationClass}`, clickable: true }}
        breakpoints={{ 768: { slidesPerView: desktopPerView } }}
      >
        {items.map((item) => {
          const price = catalogCardPrice(item);
          const isPackage = item.type === "package";
          const soldOut = item.is_in_stock === false;
          const key = itemKey(item);

          return (
            <SwiperSlide className="swiper-slide" key={key}>
              <div className="pw-card">
                <button
                  type="button"
                  className="pw-cardQuick"
                  aria-label={`Quick view ${item.name}`}
                  onClick={() => openQuickView(item)}
                />
                <div className="pw-cardMedia">
                  {item.badge_text ? <span className="pw-cardBadge">{item.badge_text}</span> : null}
                  {item.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      loading="lazy"
                      src={item.hero_image_url}
                      alt={item.name || ""}
                      width={300}
                      height={300}
                    />
                  ) : null}
                  {/* A PLAN-QUOTING CARD SENDS THEM TO PICK ONE — see
                      `cardQuotesAPlan`. Stacks always take this branch today;
                      a product would the day it gets a monthly plan cheaper
                      than its own price. */}
                  {isPackage || cardQuotesAPlan(item) ? (
                    <a
                      className="pw-cardCta"
                      href={isPackage ? packageHref(item.slug) : productHref(item.slug)}
                    >
                      {isPackage ? "View Stack" : "Choose a plan"}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="pw-cardCta"
                      disabled={busy || soldOut}
                      onClick={() => addToCart(item)}
                    >
                      {soldOut ? "Out of Stock" : "Add to Stack"}
                    </button>
                  )}
                </div>
                <div className="pw-cardInfo">
                  <span className="pw-cardName">{item.name}</span>
                  {price ? <span className="pw-cardPrice">{price}</span> : null}
                  {errorKey === key ? (
                    <span className="pw-cardError" role="alert">
                      Could not add — please try again.
                    </span>
                  ) : null}
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
      <div className={`sw-dot-default ${paginationClass} justify-content-center`} />
      <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />
    </div>
  );
}
