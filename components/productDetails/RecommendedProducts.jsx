"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import RelationCard from "./RelationCard";

/**
 * Theme `productDetails/RecommendedProdtcts.jsx` rail ("People Also
 * Bought") fed by the detail payload's related[] — a MIXED product/package
 * list, all of it rendered by one card. It used to route by `type` into the
 * two catalog listing cards, which are different designs, so a rail with one
 * of each read as a broken page. See RelationCard for why that card is its
 * own component rather than a variant of the listing ones.
 *
 * `.rel-rail` carries the band's vertical padding: it had none, so the rail
 * collided with whatever section preceded it and with the footer. The padding
 * is on the rail, not on the container it sits inside, because that container
 * is shared with the rest of the page.
 *
 * Hidden entirely when the API returns no related items. `title` and `idSuffix`
 * let the V-Conversion template render several rails (related / stacks /
 * associated) on one page without the swiper nav/pagination selectors
 * colliding.
 */
export default function RecommendedProducts({
  items = [],
  title = "People Also Bought",
  idSuffix = "bought",
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="rel-rail">
      <div className="container">
        <div className="flat-title wow fadeInUp">
          <h4 className="title">{title}</h4>
        </div>
        <div className="hover-sw-nav hover-sw-2 wow fadeInUp">
          <Swiper
            dir="ltr"
            className="swiper tf-swiper wrap-sw-over"
            {...{
              // ONE FULL-WIDTH SLIDE ON PHONES. The base is the phone value —
              // the 768/1200 entries below override upward — and at 2-up a card
              // was 173px, which is where the operator saw the image sitting off
              // to one side of its own title. The pagination dots below are the
              // scroll affordance; they already render under xl.
              slidesPerView: 1,
              spaceBetween: 12,
              speed: 800,
              observer: true,
              observeParents: true,
              slidesPerGroup: 1,
              navigation: {
                clickable: true,
                nextEl: `.nav-next-${idSuffix}`,
                prevEl: `.nav-prev-${idSuffix}`,
              },
              pagination: { el: `.sw-pagination-${idSuffix}`, clickable: true },
              breakpoints: {
                768: { slidesPerView: 3, spaceBetween: 12, slidesPerGroup: 3 },
                1200: { slidesPerView: 4, spaceBetween: 24, slidesPerGroup: 4 },
              },
            }}
            modules={[Pagination, Navigation]}
          >
            {items.map((item) => (
              <SwiperSlide className="swiper-slide" key={`${item.type}-${item.slug}`}>
                <RelationCard item={item} />
              </SwiperSlide>
            ))}
            <div className={`d-flex d-xl-none sw-dot-default sw-pagination-${idSuffix} justify-content-center`} />
          </Swiper>
          <div className={`d-none d-xl-flex swiper-button-next nav-swiper nav-next-${idSuffix}`} />
          <div className={`d-none d-xl-flex swiper-button-prev nav-swiper nav-prev-${idSuffix}`} />
        </div>
      </div>
    </section>
  );
}
