import Html from "@/components/Html";
import { getConfig } from "@/lib/api";
import { serviceAction } from "@/lib/services";
import CtaLink from "./CtaLink";
import SectionHeader from "./SectionHeader";

/**
 * Price cards (backend type `pricing-tiers`, `main_tiers`, max two).
 *
 * BCH sells one membership billed monthly or annually, so the two cards are
 * the same product at two cadences, not tiers to compare. Each card reads
 * `title`, `price`, `price_suffix`, `price_note_micro`, `features`,
 * `callout_heading` / `callout_body` (the founding-member rate) and
 * `cta_label` / `cta_url` / `cta_micro`.
 *
 * With `service` set, a card without its own CTA uses the service's
 * launch-state action, so "Join the waitlist" becomes "Join membership" the
 * day checkout opens. The blueprint's accents, pills and peptide card are
 * Atlas features and are not rendered.
 */
export default async function PricingSection({ section }) {
  const data = section.data ?? {};
  const tiers = (data.main_tiers ?? []).filter((tier) => tier?.price);

  if (!tiers.length) {
    return null;
  }

  const action = data.service ? serviceAction((await getConfig())?.services, data.service) : null;

  return (
    <section className="bch-pricing" id={section.anchor || undefined}>
      <div className="bch-container">
        <SectionHeader data={data} size="md" align="center" />
        <div className={`bch-pricing__grid bch-pricing__grid--${tiers.length}`}>
          {tiers.map((tier) => (
            <article key={tier.title || tier.price} className="bch-pricing__card">
              {tier.title ? <h3 className="bch-pricing__name">{tier.title}</h3> : null}
              {tier.subtitle ? <p className="bch-pricing__sub">{tier.subtitle}</p> : null}
              <p className="bch-pricing__price">
                <span className="bch-pricing__amount">{tier.price}</span>
                {tier.price_suffix ? <span className="bch-pricing__suffix">{tier.price_suffix}</span> : null}
              </p>
              {tier.price_note_micro ? <p className="bch-pricing__note">{tier.price_note_micro}</p> : null}

              {tier.features?.length ? (
                <ul className="bch-pricing__features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : null}

              {tier.callout_heading ? (
                <div className="bch-pricing__callout">
                  <p className="bch-eyebrow">{tier.callout_heading}</p>
                  <Html value={tier.callout_body} className="bch-pricing__callout-body" />
                </div>
              ) : null}

              <div className="bch-pricing__action">
                <CtaLink
                  label={tier.cta_label || action?.label}
                  url={tier.cta_url || action?.url}
                />
                {tier.cta_micro ? <p className="bch-pricing__micro">{tier.cta_micro}</p> : null}
              </div>
            </article>
          ))}
        </div>
        <Html value={data.footnote} className="bch-pricing__footnote" />
      </div>
    </section>
  );
}
