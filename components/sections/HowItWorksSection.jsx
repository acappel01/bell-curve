import Html from "../Html";
import Heading from "./Heading";

/**
 * `how-it-works` blueprint → theme "PersonalizedProtocol" markup (hiw-*).
 * Data: eyebrow, heading, emphasis, lead, steps[{number, title, meta, body}],
 * cta_label, cta_url.
 */
export default function HowItWorksSection({ section }) {
  const data = section.data ?? {};

  return (
    <section id={section.anchor || "how-it-works"} className="hiw-section sx-section">
      <div className="hiw-inner sx-content">
        <div className="hiw-header">
          <Heading className="hiw-heading" heading={data.heading} emphasis={data.emphasis} />
          <Html as="p" inline className="hiw-label" value={data.eyebrow} />
          <Html as="p" inline className="hiw-lead" value={data.lead} />
        </div>

        <div className="hiw-stepsRow">
          {(data.steps ?? []).map((step, index) => (
            <div className="hiw-step" key={step.number ?? index}>
              <span className="hiw-dot" aria-hidden="true" />
              <div className="hiw-stepText">
                <Heading as="h3" className="hiw-stepTitle" heading={step.title} />
                <Html className="hiw-stepDescription" value={step.body} />
                <Html as="p" inline className="hiw-stepMeta" value={step.meta} />
              </div>
            </div>
          ))}
        </div>

        {data.cta_label ? (
          <a className="hiw-ctaButton" href={data.cta_url || "#"}>
            {data.cta_label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
