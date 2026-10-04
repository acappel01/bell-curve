"use client";

import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { PackageListingCard, ProductListingCard } from "@/components/catalog/cards";

/**
 * Cross-sell rail atop the catalog listings — the stacks slider on
 * /products and the products slider on /stacks. Reuses the listing cards
 * and the theme's flat-title + hover-sw-nav slider chrome (same adaptation
 * as RecommendedProducts). Hidden entirely when there is nothing to show.
 *
 * `kind` is the type of the ITEMS in the rail ("product" | "package") —
 * package ps-cards are wide, so they get fewer slides per view.
 */
export default function CrossSlider({ title, items = [], kind, ctaHref, ctaLabel }) {
  if (!items.length) {
    return null;
  }

  const isPackage = kind === "package";
  const navSuffix = `cross-${kind}`;

  return (
    <section className="overflow-hidden tf-cross-slider">
      <div className="container">
        <div className="flat-title wow fadeInUp">
          <h4 className="title">{title}</h4>
          {ctaHref && ctaLabel ? (
            <a className="tf-btn-line" href={ctaHref}>
              {ctaLabel}
            </a>
          ) : null}
        </div>
        <div className="hover-sw-nav hover-sw-2 wow fadeInUp">
          <Swiper
            dir="ltr"
            className="swiper tf-swiper wrap-sw-over"
            modules={[Pagination, Navigation]}
            // One full-width slide on phones for BOTH kinds; the 768+ entries
            // below restore the multi-up layouts. Packages were already 1 — the
            // ps-card is wide — and products were 2, which is the 173px card the
            // operator reported.
            slidesPerView={1}
            spaceBetween={12}
            speed={800}
            grabCursor
            observer
            observeParents
            navigation={{
              clickable: true,
              nextEl: `.nav-next-${navSuffix}`,
              prevEl: `.nav-prev-${navSuffix}`,
            }}
            pagination={{ el: `.sw-pagination-${navSuffix}`, clickable: true }}
            breakpoints={
              isPackage
                ? {
                    768: { slidesPerView: 2, spaceBetween: 12 },
                    1200: { slidesPerView: 3, spaceBetween: 24 },
                  }
                : {
                    768: { slidesPerView: 3, spaceBetween: 12 },
                    1200: { slidesPerView: 4, spaceBetween: 24 },
                  }
            }
          >
            {items.map((item) => (
              <SwiperSlide className="swiper-slide" key={item.slug ?? item.id}>
                {isPackage ? (
                  <PackageListingCard pkg={item} />
                ) : (
                  <ProductListingCard product={item} />
                )}
              </SwiperSlide>
            ))}
            <div
              className={`d-flex d-xl-none sw-dot-default sw-pagination-${navSuffix} justify-content-center`}
            />
          </Swiper>
          <div className={`d-none d-xl-flex swiper-button-next nav-swiper nav-next-${navSuffix}`} />
          <div className={`d-none d-xl-flex swiper-button-prev nav-swiper nav-prev-${navSuffix}`} />
        </div>
      </div>
    </section>
  );
}
