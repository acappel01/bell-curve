"use client";
import Html from "../Html";
import { useRef, useState } from "react";
import Heading from "./Heading";

const QuoteIcon = () => (
  <svg
    className="tes-quoteIcon"
    width="62"
    height="62"
    viewBox="0 0 62 62"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M23.25 29.0625H11.8381C12.1982 26.6645 13.0545 24.368 14.3522 22.3197C15.6499 20.2713 17.3606 18.5161 19.375 17.1662L22.8431 14.8412L20.7119 11.625L17.2437 13.95C14.3245 15.8954 11.9306 18.5313 10.2744 21.6239C8.6183 24.7165 7.75118 28.17 7.75 31.6781V44.5625C7.75 45.5902 8.15826 46.5758 8.88496 47.3025C9.61166 48.0292 10.5973 48.4375 11.625 48.4375H23.25C24.2777 48.4375 25.2633 48.0292 25.99 47.3025C26.7167 46.5758 27.125 45.5902 27.125 44.5625V32.9375C27.125 31.9098 26.7167 30.9242 25.99 30.1975C25.2633 29.4708 24.2777 29.0625 23.25 29.0625ZM50.375 29.0625H38.9631C39.3232 26.6645 40.1795 24.368 41.4772 22.3197C42.7749 20.2713 44.4856 18.5161 46.5 17.1662L49.9681 14.8412L47.8563 11.625L44.3687 13.95C41.4495 15.8954 39.0556 18.5313 37.3994 21.6239C35.7433 24.7165 34.8762 28.17 34.875 31.6781V44.5625C34.875 45.5902 35.2833 46.5758 36.01 47.3025C36.7367 48.0292 37.7223 48.4375 38.75 48.4375H50.375C51.4027 48.4375 52.3883 48.0292 53.115 47.3025C53.8417 46.5758 54.25 45.5902 54.25 44.5625V32.9375C54.25 31.9098 53.8417 30.9242 53.115 30.1975C52.3883 29.4708 51.4027 29.0625 50.375 29.0625Z"
      fill="black"
    />
  </svg>
);

/**
 * `testimonials` blueprint → theme "Testimonials" scroll carousel (tes-*).
 * Data: eyebrow, heading, emphasis, quotes[{name, title, quote, stars,
 * initials, protocol, image}], rating_stats.
 */
export default function TestimonialsSection({ section }) {
  const data = section.data ?? {};
  const trackRef = useRef(null);
  const [scrollPercent, setScrollPercent] = useState(0);

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
    setScrollPercent(maxScroll > 0 ? (track.scrollLeft / maxScroll) * 100 : 0);
  };

  return (
    <section
      id={section.anchor || undefined}
      className="tes-section sx-section"
      aria-label="Client success stories"
    >
      <div className="tes-inner sx-content">
        <Heading className="tes-heading" heading={data.heading} emphasis={data.emphasis} />

        <div className="tes-carouselWrapper">
          <div className="tes-carousel" ref={trackRef} onScroll={handleTrackScroll}>
            {(data.quotes ?? []).map((testimonial, index) => (
              <article className="tes-card" key={testimonial.name ?? index}>
                <div className="tes-cardHeader">
                  <p className="tes-name">
                    <Html as="span" inline value={testimonial.name} />
                    {testimonial.title ? (
                      <span className="tes-title">
                        {" — "}
                        <Html as="span" inline value={testimonial.title} />
                      </span>
                    ) : null}
                  </p>
                  <QuoteIcon />
                </div>

                <Html as="p" inline className="tes-quote" value={testimonial.quote} />
              </article>
            ))}
          </div>

          <input
            className="tes-rangeInput"
            type="range"
            min={0}
            max={100}
            value={scrollPercent}
            onChange={handleRangeChange}
            style={{ "--pct": `${scrollPercent}%` }}
            aria-label="Scroll through client testimonials"
          />
        </div>
      </div>
    </section>
  );
}
