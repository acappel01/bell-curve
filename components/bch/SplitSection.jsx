import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import Picture from "./Picture";
import SideNote from "./SideNote";

/**
 * BCH image + copy split (backend type `image-text-split`).
 *
 * Adds two optional fields to the blueprint:
 * - `image_shape`: "organic" (the brand's curved mask, bleeding to the page
 *   edge on the image side), "arch", or "none" (the image as supplied, for
 *   approved files that carry their own composition and must not be cropped);
 * - `side_note`: the small stacked caps note beside the image.
 */
export default function SplitSection({ section }) {
  const data = section.data ?? {};
  const imageRight = data.image_right !== false;
  const shape = data.image_shape || "organic";
  const image = data.image?.url ? { url: data.image.url, alt: data.image_alt ?? data.image.alt ?? "" } : null;

  return (
    <section
      id={section.anchor || undefined}
      className={`bch-split bch-split--${imageRight ? "right" : "left"} bch-split--${shape}`}
    >
      <div className="bch-split__copy">
        {data.eyebrow ? <p className="bch-eyebrow">{data.eyebrow}</p> : null}
        <Heading
          className="bch-display bch-display--lg"
          heading={data.heading}
          emphasis={data.emphasis}
        />
        <Html value={data.lead} inline as="p" className="bch-lead" />
        <Html value={data.body} className="bch-split__body" />
        <CtaLink label={data.cta_label} url={data.cta_url} variant="link" />
      </div>

      {image ? (
        <div className="bch-split__media">
          <Picture image={image} className="bch-split__picture" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      ) : null}

      <SideNote value={data.side_note} className="bch-split__note" />
    </section>
  );
}
