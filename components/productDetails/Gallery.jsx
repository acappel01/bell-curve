"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Thumbs } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import PhotoSwipeLightbox from "photoswipe/lightbox";

/**
 * Theme `productDetails/sliders/Slider1.jsx` — vertical thumbs + main media
 * Swiper with Drift hover-zoom and PhotoSwipe lightbox — fed by API image
 * URLs instead of the theme's hardcoded color/size slide set (the catalog
 * carries no variant swatches, so that state machine is dropped).
 *
 * `images` is the already-resolved list (gallery[] falling back to
 * hero_image_url); parent renders nothing when there are no images at all.
 *
 * `zoomEnabled` is the site-wide `theme.product_zoom_enabled` setting, off by
 * default, threaded down from the route's /config read. drift-zoom is loaded
 * with a dynamic `import()` rather than a static one BECAUSE of it: a static
 * import ships the library to every visitor even though it only ever binds
 * above 1200px, so "off" would have meant an unbound instance rather than an
 * absent download. The PhotoSwipe lightbox above is a separate concern and
 * deliberately untouched — the operator asked about hover zoom only, and its
 * heavy half is already dynamic (`pswpModule`).
 */
export default function Gallery({ images, name, zoomEnabled = false }) {
  const [thumbSwiper, setThumbSwiper] = useState(false);
  const lightboxRef = useRef(null);

  useEffect(() => {
    if (!zoomEnabled) return;

    const checkWindowSize = () => window.innerWidth >= 1200;
    if (!checkWindowSize()) return;

    // The import is async, so the component can unmount before it lands;
    // without this the callback would bind Drift to detached nodes.
    let cancelled = false;

    import("drift-zoom").then(({ default: Drift }) => {
      if (cancelled) return;

      const pane = document.querySelector(".tf-zoom-main");
      document.querySelectorAll(".tf-image-zoom").forEach((el) => {
        new Drift(el, {
          zoomFactor: 2,
          paneContainer: pane,
          inlinePane: false,
          handleTouch: false,
          hoverBoundingBox: true,
          containInline: true,
        });
      });
    });

    const zoomElements = document.querySelectorAll(".tf-image-zoom");

    const handleMouseOver = (event) => {
      const parent = event.target.closest(".section-image-zoom");
      if (parent) {
        parent.classList.add("zoom-active");
      }
    };

    const handleMouseLeave = (event) => {
      const parent = event.target.closest(".section-image-zoom");
      if (parent) {
        parent.classList.remove("zoom-active");
      }
    };

    zoomElements.forEach((element) => {
      element.addEventListener("mouseover", handleMouseOver);
      element.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      cancelled = true;
      zoomElements.forEach((element) => {
        element.removeEventListener("mouseover", handleMouseOver);
        element.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, [zoomEnabled]);

  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: "#gallery-swiper-started",
      children: ".item",
      pswpModule: () => import("photoswipe"),
    });

    lightbox.init();
    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
    };
  }, []);

  return (
    <>
      {/* Thumbs are desktop-only: hidden below 1200px in _product-buy-box.scss
          (mobile and tablet get the arrows-only main carousel), which is the
          same boundary the zoom effect gates on. Observer re-measures the
          vertical swiper when a resize brings it back from display:none. */}
      <Swiper
        dir="ltr"
        className="swiper tf-product-media-thumbs other-image-zoom"
        slidesPerView={4}
        direction="vertical"
        onSwiper={setThumbSwiper}
        modules={[Thumbs]}
        spaceBetween={8}
        observer
        observeParents
      >
        {images.map((imgSrc, index) => (
          <SwiperSlide key={index} className="swiper-slide stagger-item">
            <div className="item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="lazyload"
                data-src={imgSrc}
                alt={name || "img-product"}
                src={imgSrc}
                width={828}
                height={1241}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="flat-wrap-media-product">
        <Swiper
          modules={[Thumbs, Navigation]}
          dir="ltr"
          className="swiper tf-product-media-main"
          id="gallery-swiper-started"
          thumbs={{ swiper: thumbSwiper }}
          navigation={{
            prevEl: ".snbp1",
            nextEl: ".snbn1",
          }}
        >
          {images.map((imgSrc, i) => (
            <SwiperSlide key={i} className="swiper-slide">
              <a
                href={imgSrc}
                target="_blank"
                className="item"
                data-pswp-width="552px"
                data-pswp-height="827px"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="tf-image-zoom lazyload"
                  data-zoom={imgSrc}
                  data-src={imgSrc}
                  alt={name || "img-product"}
                  src={imgSrc}
                  width={828}
                  height={1241}
                />
              </a>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="swiper-button-next nav-swiper thumbs-next snbn1" />
        <div className="swiper-button-prev nav-swiper thumbs-prev snbp1" />
      </div>
    </>
  );
}
