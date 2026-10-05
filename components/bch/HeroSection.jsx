import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import HeroVideo from "./HeroVideo";
import Picture from "./Picture";

/**
 * BCH hero (backend type `hero`, static "banner" fields).
 *
 * Copy sits left over the bright side of the photograph; the subject sits
 * right. On phones the photograph becomes a short banner above the copy so
 * the headline and BOTH first-screen actions (Telehealth Care, Shop) stay
 * above the fold, which is the client's five-second test.
 *
 * Media, in order of preference:
 * - `background_video`: `{ url, type }` or a list of them, a self-hosted muted
 *   loop with `background_image` as poster (PRX enhancement #4);
 * - `background_image` with optional `background_image_mobile` crop.
 *
 * `trust_microcopy` is the lead-in under the buttons; `microcopy_link_*` turns
 * its tail into the Health Map link ("Not sure where to begin? Start your free
 * Health Map →").
 */
export default function HeroSection({ section }) {
  const data = section.data ?? {};
  const videoSources = [data.background_video].flat().filter((source) => source?.url);

  return (
    <section className="bch-hero" id={section.anchor || undefined}>
      <div className="bch-hero__media">
        <Picture
          image={data.background_image}
          mobile={data.background_image_mobile}
          className="bch-hero__picture"
          priority
          sizes="100vw"
        />
        {videoSources.length ? (
          <HeroVideo sources={videoSources} poster={data.background_image?.url} />
        ) : null}
      </div>

      <div className="bch-container bch-hero__inner">
        <div className="bch-hero__copy">
          {data.eyebrow ? <p className="bch-eyebrow">{data.eyebrow}</p> : null}
          <Heading
            as="h1"
            className="bch-display bch-display--xl bch-hero__title"
            heading={data.headline}
            emphasis={data.headline_emphasis}
          />
          <Html value={data.subhead} inline as="p" className="bch-lead bch-hero__lead" />

          <div className="bch-hero__actions">
            <CtaLink label={data.primary_cta_label} url={data.primary_cta_url} />
            <CtaLink
              label={data.secondary_cta_label}
              url={data.secondary_cta_url}
              variant="outline"
              arrow={false}
            />
          </div>

          {data.trust_microcopy || data.microcopy_link_label ? (
            <p className="bch-hero__micro">
              {data.trust_microcopy}{" "}
              <CtaLink
                label={data.microcopy_link_label}
                url={data.microcopy_link_url}
                variant="link"
                className="bch-hero__micro-link"
              />
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
