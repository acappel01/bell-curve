/**
 * `testimonial` sub-block → the theme's hero highlight card.
 *
 * Data: title, subtitle, quote (all inline rich text), image
 * {url, alt, width, height}. Markup is the theme's `.testimonialCard`,
 * unchanged — the styles live in `_slider.scss` and are what an operator
 * expects to keep looking like.
 *
 * Was four flat fields on the hero blueprint (highlight_title / _subtitle /
 * _quote / _image) rendering fixed markup INSIDE the slide loop, which meant
 * one card, no positioning, and — latently — the same card repeated once per
 * slide. As a typed child it repeats properly and carries its own knobs.
 *
 * NOT YET PORTABLE, despite being a block: `_slider.scss` scopes every
 * `.testimonial*` rule under `.tf-slideshow`, so this renders unstyled
 * anywhere else. Offering it on a second section means lifting those rules
 * into a partial of their own first — the scoping was deliberate (they were
 * flat theme selectors leaking generic names globally) and undoing it needs
 * the same care.
 *
 * The progress bar is decoration the theme draws, not authored content, so it
 * renders whenever the card does.
 */

import Html from "@/components/Html";
import { toPlainText } from "@/lib/richText";

export default function TestimonialCard({ data }) {
  return (
    <div className="testimonialCard">
      {data.image?.url ? (
        <div className="testimonialThumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="testimonialThumbImage"
            src={data.image.url}
            alt={data.image.alt || toPlainText(data.title)}
          />
        </div>
      ) : null}
      <div className="testimonialBody">
        <div className="testimonialHeading">
          <Html as="p" inline className="testimonialLabel" value={data.title} />
          <Html
            as="p"
            inline
            className="testimonialAudience"
            value={data.subtitle}
          />
        </div>
        <div className="testimonialProgress">
          <span className="testimonialProgressFill" />
        </div>
        <Html as="p" inline className="testimonialQuote" value={data.quote} />
      </div>
    </div>
  );
}
