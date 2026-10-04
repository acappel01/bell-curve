"use client";

import Heading from "./Heading";
import { useRef } from "react";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { productHref } from "@/lib/routes";

/**
 * `product-slider` blueprint → theme "Products" carousels of ProductCard6
 * cards. Data: heading, cta_label/cta_url, card_cta_label, variant
 * ("progressbar" = theme common/Products.jsx, "arrows" = theme Products2.jsx
 * titled slider), products[] — inlined catalog product cards.
 *
 * Pagination/navigation use per-instance refs instead of shared class
 * selectors so multiple sliders on one page don't cross-wire.
 */
export default function ProductSliderSection({ section }) {
  const data = section.data ?? {};
  const products = data.products ?? [];
  const paginationRef = useRef(null);
  const nextRef = useRef(null);
  const prevRef = useRef(null);

  if (!products.length) {
    return null;
  }

  const arrows = data.variant === "arrows";

  const bindControls = (swiper) => {
    swiper.params.pagination.el = paginationRef.current;
    if (arrows) {
      swiper.params.navigation.nextEl = nextRef.current;
      swiper.params.navigation.prevEl = prevRef.current;
    }
  };

  const slides = (
    <Swiper
      dir="ltr"
      className={`swiper tf-swiper${arrows ? " wrap-sw-over" : ""}`}
      modules={[Pagination, Navigation]}
      slidesPerView={2}
      spaceBetween={12}
      speed={800}
      grabCursor
      observer
      observeParents
      slidesPerGroup={arrows ? 2 : 1}
      navigation={arrows ? { clickable: true, nextEl: null, prevEl: null } : undefined}
      pagination={
        arrows
          ? { el: null, clickable: true }
          : { el: null, clickable: true, type: "progressbar" }
      }
      onBeforeInit={bindControls}
      breakpoints={
        arrows
          ? {
              768: { slidesPerView: 3, spaceBetween: 12, slidesPerGroup: 3 },
              1200: { slidesPerView: 4, spaceBetween: 24, slidesPerGroup: 4 },
            }
          : {
              768: { slidesPerView: 3, spaceBetween: 12 },
              1200: { slidesPerView: 4, spaceBetween: 24 },
            }
      }
    >
      {products.map((product) => (
        <SwiperSlide className="swiper-slide" key={product.slug ?? product.id}>
          <ProductCard product={product} ctaLabel={data.card_cta_label} />
        </SwiperSlide>
      ))}
      {arrows ? (
        <div
          ref={paginationRef}
          className="d-flex d-xl-none sw-dot-default sw-pagination-top-pick justify-content-center"
        />
      ) : (
        <div ref={paginationRef} className="sw-pagination-top-pick position-relative" />
      )}
    </Swiper>
  );

  // ONE outer for both variants. They used to be two separate returns: the
  // progressbar one wore `.product-section` (legacy full-bleed list) and the
  // arrows one wore theme utilities and was in no list at all, so the layout
  // knobs behaved differently depending on a dropdown the operator picked for
  // an unrelated reason. Both now render `.sx-section` > `.sx-content`; the
  // variant only decides the band's own styling and what goes in the column.
  return (
    <section
      id={section.anchor || undefined}
      className={
        arrows
          ? "sx-section flat-spacing-3 pt-0 overflow-hidden"
          : "product-section sx-section"
      }
    >
      <div className="product-column sx-content">
        {arrows ? (
          <>
            {data.heading ? (
              <div className="flat-title">
                <Heading as="h4" className="title" heading={data.heading} />
                {data.cta_label ? (
                  <a className="tf-btn-line" href={data.cta_url || "#"}>
                    {data.cta_label}
                  </a>
                ) : null}
              </div>
            ) : null}
            <div className="fl-control-sw2 pos2">
              {slides}
              <div ref={nextRef} className="d-none d-xl-flex swiper-button-next nav-swiper nav-next-top-pick" />
              <div ref={prevRef} className="d-none d-xl-flex swiper-button-prev nav-swiper nav-prev-top-pick" />
            </div>
          </>
        ) : (
          slides
        )}
      </div>
    </section>
  );
}

/**
 * Theme ProductCard6 markup fed from a catalog product card: hero image with
 * gallery[0] as the hover swap, name + short description, optional CTA link.
 */
function ProductCard({ product, ctaLabel }) {
  const href = productHref(product.slug);
  const imgSrc = product.hero_image_url;
  const imgHover = product.gallery?.[0] || imgSrc;
  const swatches = [...new Set([imgSrc, imgHover])].filter(Boolean);

  return (
    <div className="card-product style-4">
      <div className="card-product-wrapper radius-16 line-2 asp-ratio-0">
        <a href={href} className="product-img">
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" className="img-product" alt={product.name || ""} src={imgSrc} width={172} height={344} />
          ) : null}
          {imgHover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" className="img-hover" alt={product.name || ""} src={imgHover} width={172} height={344} />
          ) : null}
        </a>
      </div>
      <div className="card-product-info">
        <a href={href} className="name-product link fw-medium text-md">
          {product.name}
        </a>
        {product.short_description ? <p>{product.short_description}</p> : null}
        {ctaLabel ? (
          <a href={href} className="name-product link fw-medium text-md">
            {ctaLabel}
          </a>
        ) : null}
        {swatches.length ? (
          <ul className="list-color-product list-capacity-product justify-content-center">
            {swatches.map((src) => (
              <li className="list-color-item color-swatch" key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" alt={product.name || ""} src={src} width={172} height={344} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
