"use client";

import Heading from "./Heading";
import Html from "../Html";
import { useRef, useState } from "react";
import { money } from "./support";
import { toPlainText } from "@/lib/richText";
import { packageHref } from "@/lib/routes";

/**
 * `package-slider` blueprint → theme "PriceSlider" markup (ps-*).
 * Data: heading, subhead, packages[] — inlined catalog package cards whose
 * default plan supplies the introductory and recurring pricing.
 *
 * THE CARD WORDING IS THE OPERATOR'S, not this file's. "First month",
 * "Recurring", the button label and its href were hardcoded here, which is
 * hard rule 1 — an install that does not sell monthly, or does not speak
 * English, could not change them without a developer. Each is now a blueprint
 * field, and each is OMITTED when unset rather than falling back to the string
 * this component used to hold: a fallback would leave the copy in the
 * component, which is the thing being fixed.
 *
 * THREE LEVELS, because `.ps-banner` is a visual card (background photo,
 * 16px radius, its own padding): band > `.sx-content` column > card. Hanging
 * `.sx-content` on the card would make content_inset overwrite the card's
 * design padding instead of moving the card — same reasoning as final-cta
 * and comparison-table.
 *
 * NOT the stats-marquee exception, despite also overflowing: `.ps-carousel`
 * is its own scroll container (`width: 100%; overflow-x: auto`), so nothing
 * escapes the column and no ancestor has to do the clipping.
 */
export default function PackageSliderSection({ section }) {
  const data = section.data ?? {};
  const packages = data.packages ?? [];
  const introLabel = toPlainText(data.price_intro_label);
  const recurringLabel = toPlainText(data.price_recurring_label);
  const ctaLabel = toPlainText(data.cta_label);
  const ctaUrl = data.cta_url;
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [dragging, setDragging] = useState(false);

  if (!packages.length) {
    return null;
  }

  const scrollToPercent = (percent) => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    track.scrollTo({ left: (percent / 100) * maxScroll, behavior: "auto" });
  };

  const handleRangeChange = (event) => {
    const percent = Number(event.target.value);
    setScrollPercent(percent);
    scrollToPercent(percent);
  };

  const handleTrackScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const percent = maxScroll > 0 ? (track.scrollLeft / maxScroll) * 100 : 0;
    setScrollPercent(percent);
  };

  // Mouse drag-to-scroll. Touch input scrolls the overflow track natively —
  // only pointerType "mouse" is handled here. scroll-behavior flips to "auto"
  // during a drag so scrollLeft tracks the pointer without smooth-scroll lag.
  const handlePointerDown = (event) => {
    const track = trackRef.current;
    if (event.pointerType !== "mouse" || !track) return;
    dragRef.current = { startX: event.clientX, startScroll: track.scrollLeft, moved: false };
    track.style.scrollBehavior = "auto";
    track.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 5) drag.moved = true;
    track.scrollLeft = drag.startScroll - delta;
  };

  const handlePointerEnd = () => {
    const track = trackRef.current;
    if (track) track.style.scrollBehavior = "";
    setDragging(false);
  };

  // A drag that ends on a card must not fire the card's CTA link.
  const suppressClickAfterDrag = (event) => {
    if (dragRef.current?.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
    dragRef.current = null;
  };

  return (
    <section id={section.anchor || undefined} className="ps-section sx-section">
      <div className="sx-content">
        {/* The banner carries the background image: media_width "full" bleeds it. */}
        <div className="ps-banner sx-media">
          <div className="ps-inner">
            <div className="ps-headerRow">
              <Html as="p" inline className="ps-intro" value={data.subhead} />
              <Heading className="ps-heading" heading={data.heading} />
            </div>
            <div className="ps-carouselWrapper">
              <div
                className={`ps-carousel${dragging ? " is-dragging" : ""}`}
                ref={trackRef}
                onScroll={handleTrackScroll}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onClickCapture={suppressClickAfterDrag}
              >
                {packages.map((pkg) => {
                  const plan = pkg.plans?.find((p) => p.is_default) ?? pkg.plans?.[0];
                  const price = plan?.price;

                  return (
                    <article className="ps-card" key={pkg.slug ?? pkg.id}>
                      <div className="ps-cardHeader">
                        <div className="ps-cardHeading">
                          <h3 className="ps-cardTitle">{pkg.name}</h3>
                          <div className="ps-cardPricing">
                            {price?.intro != null ? (
                              <p className="ps-priceFirst">
                                {introLabel ? `${introLabel} ` : ""}
                                {money(price.intro)}
                              </p>
                            ) : null}
                            {price?.effective ? (
                              <p className="ps-priceRecurring">
                                {recurringLabel ? `${recurringLabel} ` : ""}
                                {money(price.effective)}
                                {price.suffix || ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {pkg.hero_image_url ? (
                          <img className="ps-cardImage" src={pkg.hero_image_url} alt="" aria-hidden="true" />
                        ) : null}
                      </div>
                      {pkg.short_description ? (
                        <p className="ps-cardDescription">{pkg.short_description}</p>
                      ) : null}
                      {ctaLabel ? (
                        // EACH CARD GOES TO ITS OWN PACKAGE. This used to be the
                        // section's single `cta_url` for every card, so a slider
                        // of four stacks sent all four to the same place — on the
                        // live home page, to `#get-started`, an anchor. The label
                        // already names the individual package ("Start my
                        // Performance Stack"), so the button read as
                        // per-package while behaving as one shared link.
                        //
                        // `cta_url` stays as the fallback for a package with no
                        // slug, which is the only case that has nowhere of its
                        // own to point at.
                        <a className="ps-cardButton" href={packageHref(pkg.slug) || ctaUrl || "#"}>
                          {/* {package} is the one interpolation this field
                              supports, so an operator can write "Start my
                              {package}" once and have it name each card. */}
                          {ctaLabel.replace(/\{package\}/g, pkg.name ?? "")}
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              <input
                className="ps-rangeInput"
                type="range"
                min={0}
                max={100}
                value={scrollPercent}
                onChange={handleRangeChange}
                style={{ "--pct": `${scrollPercent}%` }}
                aria-label={
                  toPlainText(data.range_aria_label) || "Scroll through plans"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
