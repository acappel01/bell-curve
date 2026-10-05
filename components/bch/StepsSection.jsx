import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import Picture from "./Picture";
import SectionHeader from "./SectionHeader";

/**
 * A real sequence (backend type `how-it-works`): `steps: [{ number, title,
 * meta, body }]` plus the header fields and an optional CTA.
 *
 * Used only where order is information, e.g. "Check availability → intake →
 * provider review". Unordered value lists belong in CardsSection. An optional
 * `image` sits beside the steps; How It Works uses it for the one approved
 * still life below the hero.
 */
export default function StepsSection({ section }) {
  const data = section.data ?? {};
  const steps = (data.steps ?? []).filter((step) => step?.title);
  const theme = data.theme === "ivory" ? "ivory" : "white";

  if (!steps.length) {
    return null;
  }

  return (
    <section
      className={`bch-steps bch-steps--${theme}${data.image?.url ? " bch-steps--media" : ""}`}
      id={section.anchor || undefined}
    >
      <div className="bch-container bch-steps__inner">
        {data.image?.url ? (
          <Picture image={data.image} className="bch-steps__picture" sizes="(min-width: 1024px) 34vw, 100vw" />
        ) : null}
        <div className="bch-steps__body">
          <SectionHeader data={data} size="md" />
          <ol className="bch-steps__list">
            {steps.map((step, index) => (
              <li key={step.title} className="bch-steps__item">
                <span className="bch-steps__number" aria-hidden="true">
                  {step.number || String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  {step.meta ? <p className="bch-steps__meta">{step.meta}</p> : null}
                  <h3 className="bch-steps__title">{step.title}</h3>
                  <Html value={step.body} className="bch-steps__text" />
                </div>
              </li>
            ))}
          </ol>
          <CtaLink label={data.cta_label} url={data.cta_url} variant="link" />
        </div>
      </div>
    </section>
  );
}
