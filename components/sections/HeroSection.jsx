"use client";
import { useId } from "react";

import ChildBlock, {
  renderableChildren,
} from "@/components/ChildBlockRenderer";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import Heading from "./Heading";
import Html from "../Html";

/**
 * `hero` blueprint → theme "Hero" fading slideshow. Data: slides.* (image
 * {url, alt, width, height}, image_alt, heading, heading_emphasis,
 * description, cta_label, cta_url, text_theme) plus `children` sub-blocks.
 * With no slides authored, the static fallback fields (headline, subhead,
 * primary_cta_*, background_image) become a single slide. layout "banner"
 * (Figma 339-3628) instead renders the static fields as a centered rounded
 * banner — eyebrow, serif headline, subtext, white pill CTA over the image.
 *
 * BOTH LAYOUTS now wear the .sx-section/.sx-content contract. The banner is
 * three levels because `__frame` is a visual card: band > column > card. The
 * slideshow is the band, with ONE .sx-content PER SLIDE (plus the pagination
 * row) — several instances in one section, which the contract anticipates.
 * That conversion is what let `.container` leave $content-containers and the
 * three slider wrappers leave the sx-align list in _layout-frame.scss; those
 * wrappers now read the inherited `--sx-items` in _slider.scss instead, so
 * the knob reaches them without the frame file naming this section.
 *
 * THE HIGHLIGHT CARD IS A SUB-BLOCK, not four flat fields. It used to render
 * INSIDE the slide loop, which meant one card, no way to position it, and —
 * latently — the same card repeated once per slide. It now sits in a
 * positioned slot that is a sibling of the slide Swiper, so it overlays the
 * band once regardless of slide count, and several cards become a mini
 * slider. The backend still reads the legacy highlight_* fields and serves
 * them as a one-item child, so nothing had to be migrated; this component
 * deliberately does not read those fields itself, or the card would have two
 * sources.
 */
/**
 * The 9-token anchor grid for the highlight card slot.
 *
 * A HERO BLUEPRINT FIELD, not one of the shared `sx-*` knobs, and that is the
 * whole design: positioning a child means something only where the parent owns
 * a slot to position it in, and this is the only section that does. A shared
 * knob would appear on all 24 section types and do nothing on 23 of them.
 *
 * Geometry lives in `_slider.scss`, one entry per token. `middle` there is a
 * true geometric centre as of 2026-08-25; it previously held the derived
 * `top: 59%` the slot was hardcoded to, which read as `bottom` and overflowed
 * the stage at some widths. That file records the arithmetic.
 */
const SLOT_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export default function HeroSection({ section }) {
  const data = section.data ?? {};
  // Swiper's pagination `el` is a document-wide selector, so the mini
  // slider's dots need a class no other instance can claim.
  const dotsClass = `hero-highlights__dots--${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // WHERE the cards sit, from the hero blueprint's `highlight_position`.
  //
  // THE FALLBACK IS NOT DEFENSIVE PADDING, it is the contract. The backend
  // merges only the shared LAYOUT defaults into a served payload — a
  // blueprint's own defaults() drive the admin form and the presentation
  // classification, not the JSON. So a hero saved through the admin carries
  // this key and one written by a fill script does not, and both must render
  // in the same place. `middle-right` matches the blueprint's own default, so
  // saved and unsaved heroes agree — which is the property that matters here.
  //
  // It is NOT "wherever the slot used to be": retuning `middle` to a true
  // centre on 2026-08-25 moved every hero, saved or not, by ~166px at 1440.
  // That was the point of the change and the operator approved it. Parity
  // between the two is the invariant; the placement itself is free to move.
  //
  // Validated against the allow-list for the same reason every other knob is:
  // an unrecognised value emits no class rather than a dead one.
  const slotPosition = SLOT_POSITIONS.includes(data.highlight_position)
    ? `hero-highlights__slot--${data.highlight_position}`
    : "hero-highlights__slot--middle-right";

  if (data.layout === "banner") {
    if (!data.headline && !data.background_image?.url) {
      return null;
    }

    return (
      <section
        id={section.anchor || undefined}
        className="hero-banner sx-section"
      >
        <div className="sx-content">
          {/* The frame is the media: media_width "full" bleeds it edge to edge. */}
          <div className="hero-banner__frame sx-media">
            {data.background_image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="hero-banner__bg"
                src={data.background_image.url}
                alt={data.background_image.alt || ""}
              />
            ) : null}
            <div className="hero-banner__scrim" aria-hidden />
            <div className="hero-banner__content">
              <Html
                as="p"
                inline
                className="hero-banner__eyebrow"
                value={data.eyebrow}
              />
              <Heading
                as="h1"
                className="hero-banner__title"
                heading={data.headline}
                emphasis={data.headline_emphasis}
              />
              <Html className="hero-banner__subtext" value={data.subhead} />
              {data.primary_cta_label ? (
                <a
                  className="hero-banner__cta"
                  href={data.primary_cta_url || "#"}
                >
                  {data.primary_cta_label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const slides = (data.slides ?? []).filter(
    (slide) =>
      slide && (slide.image?.url || slide.heading || slide.description),
  );

  if (!slides.length && (data.headline || data.background_image?.url)) {
    slides.push({
      image: data.background_image,
      image_alt: null,
      heading: data.headline,
      heading_emphasis: data.headline_emphasis,
      description: data.subhead,
      cta_label: data.primary_cta_label,
      cta_url: data.primary_cta_url,
      text_theme: "dark",
    });
  }

  if (!slides.length) {
    return null;
  }

  // Typed children, filtered to the block types this section positions.
  // The backend already dropped empty ones and types it no longer resolves.
  const cards = renderableChildren(data, ["testimonial"]);
  const looping = slides.length > 1;

  // The stage takes its height from the slide IMAGE, and `.box-content` is
  // absolutely positioned — so a hero built from a headline alone collapsed to
  // ZERO HEIGHT: has_content true, nothing on screen, no error anywhere.
  // Measured while building /test-page's sub-block fixture.
  //
  // The modifier is scoped rather than a blanket min-height on the stage,
  // because a hero WITH an image is shorter than any sensible minimum at
  // mobile widths (a 1840x888 image is ~188px tall at 390px) and a floor would
  // letterbox every existing hero on a phone.
  const hasMedia = slides.some((slide) => slide.image?.url);

  return (
    <section
      id={section.anchor || undefined}
      className={`tf-slideshow slider-phonecase slider-default sx-section${
        hasMedia ? "" : " tf-slideshow--no-media"
      }`}
    >
      {/* The STAGE is the visual card inside the band: it carries the theme's
          horizontal inset, the radius and the clip, and is the positioning
          context the highlight layer measures against. The band itself has to
          bleed so a background colour reaches the viewport edge, so it cannot
          also be the card — band > visual card, as final-cta and
          image-callout-banner already do. `.sx-media` makes `media_width` the
          control over whether the stage bleeds. */}
      <div className="tf-slideshow__stage sx-media">
        <Swiper
          className="swiper tf-sw-slideshow slider-effect-fade"
          modules={[EffectFade, Autoplay, Pagination]}
          effect="fade"
          autoplay={looping}
          pagination={{ clickable: true, el: ".spdh1" }}
          loop={looping}
          speed={6000}
          dir="ltr"
        >
          {slides.map((slide, index) => {
            const textClass =
              slide.text_theme === "light" ? "text-white" : "text-dark-3";

            return (
              <SwiperSlide className="swiper-slide" key={index}>
                <div className="slider-wrap">
                  <div className="image">
                    {slide.image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slide.image.url}
                        alt={slide.image_alt || slide.image.alt || ""}
                        width={slide.image.width || 1840}
                        height={slide.image.height || 888}
                      />
                    ) : null}
                  </div>
                  <div className="box-content">
                    {/* One .sx-content per slide — the section's content column
                      repeated, not a second section. The Bootstrap row stays:
                      the half-width text column at sm/md is the slide's own
                      design, not an operator knob. */}
                    <div className="sx-content">
                      <div className="row">
                        <div className="col-lg-12 col-sm-6 col-12">
                          <div className="content-slider">
                            <div className="box-title-slider">
                              <Heading
                                className={`heading fw-medium fade-item fade-item-1 ${textClass}`}
                                heading={slide.heading}
                                emphasis={slide.heading_emphasis}
                              />
                              <Html
                                className={`sub text-md fade-item fade-item-2 ${textClass}`}
                                value={slide.description}
                              />
                            </div>
                            {slide.cta_label ? (
                              <div className="box-btn-slider fade-item fade-item-3">
                                <a
                                  href={slide.cta_url || "#"}
                                  className="tf-btn btn-white fw-normal animate-btn"
                                >
                                  {slide.cta_label}
                                  <i className="icon icon-arrow-top-left" />
                                </a>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
          <div className="wrap-pagination">
            <div className="sx-content">
              <div className="sw-dots style-2 sw-pagination-slider justify-content-center spdh1" />
            </div>
          </div>
        </Swiper>

        {/* The card slot. A SIBLING of the slide Swiper, not a child of it, so
          it overlays the band once however many slides there are — the old
          markup rendered it inside slides.map and would have repeated it per
          slide. The slot owns the positioning; the card is just a card, which
          is what makes a positioning knob a change to one rule here rather
          than to every block that wants to sit somewhere. */}
        {cards.length ? (
          <div className="hero-highlights">
            {/* The slot is what is positioned. The layer around it only
                  gates the card off on phones, sets the stacking order and
                  keeps a full-size transparent overlay from swallowing
                  clicks on the slide beneath. */}
            <div className={`hero-highlights__slot ${slotPosition}`}>
              {cards.length > 1 ? (
                <Swiper
                  className="hero-highlights__slider"
                  modules={[Autoplay, Pagination]}
                  autoplay={{ delay: 5000, disableOnInteraction: false }}
                  loop
                  speed={600}
                  slidesPerView={1}
                  pagination={{ clickable: true, el: `.${dotsClass}` }}
                >
                  {cards.map((card, index) => (
                    <SwiperSlide key={index}>
                      <ChildBlock block={card} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <ChildBlock block={cards[0]} />
              )}
              {/* In FLOW under the card rather than inside the Swiper: as a
                  Swiper child the theme's absolute `.sw-dots` rules put the
                  dots over the card's bottom edge and clipped the first one.
                  Scoped by useId — Swiper's pagination `el` is a
                  document-wide selector, and the slide slider's own `.spdh1`
                  would collide if a page ever carried two heroes. */}
              {cards.length > 1 ? (
                <div
                  className={`hero-highlights__dots sw-dots style-2 ${dotsClass}`}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
