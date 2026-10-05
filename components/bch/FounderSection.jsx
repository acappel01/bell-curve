import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import Picture from "./Picture";
import SideNote from "./SideNote";

/**
 * Founder strip (flexible type `bch-founder`): portrait, short letter excerpt,
 * side note and a link to the full letter.
 *
 * The portrait is a contained horizontal crop that keeps the desk and laptop
 * in frame. The client is explicit: never a tight headshot, and never any
 * alteration of Amy's photograph beyond proportional cropping.
 */
export default function FounderSection({ section }) {
  const data = section.data ?? {};

  return (
    <section className="bch-founder" id={section.anchor || undefined}>
      <div className="bch-container">
        <div className="bch-founder__card">
          <Picture image={data.image} className="bch-founder__picture" sizes="(min-width: 1024px) 22vw, 100vw" />
          <div className="bch-founder__copy">
            <Heading className="bch-display bch-display--md" heading={data.heading} emphasis={data.emphasis} />
            <Html value={data.body} inline as="p" className="bch-founder__body" />
          </div>
          <SideNote value={data.side_note} className="bch-founder__note" />
          <div className="bch-founder__cta">
            <CtaLink label={data.cta_label} url={data.cta_url} />
          </div>
        </div>
      </div>
    </section>
  );
}
