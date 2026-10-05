import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import CtaLink from "./CtaLink";

/**
 * Compact type-led band (backend type `cta-banner`). On the homepage this is
 * the Membership bridge, which the client wants as "one concise ivory or
 * pale-blush band, not another large sales section", with no photograph.
 *
 * `theme`: "light" (ivory band) or "dark" (charcoal).
 */
export default function CtaBannerSection({ section }) {
  const data = section.data ?? {};
  const theme = data.theme === "dark" ? "dark" : "light";

  return (
    <section className={`bch-banner bch-banner--${theme}`} id={section.anchor || undefined}>
      <div className="bch-container bch-banner__inner">
        <div className="bch-banner__copy">
          {data.eyebrow ? <p className="bch-eyebrow">{data.eyebrow}</p> : null}
          <Heading className="bch-display bch-display--md" heading={data.heading} emphasis={data.emphasis} />
          <Html value={data.sub} inline as="p" className="bch-banner__sub" />
        </div>
        <div className="bch-banner__actions">
          <CtaLink label={data.primary_cta_label} url={data.primary_cta_url} variant={theme === "dark" ? "light" : "primary"} />
          <CtaLink label={data.secondary_cta_label} url={data.secondary_cta_url} variant="link" />
        </div>
      </div>
    </section>
  );
}
