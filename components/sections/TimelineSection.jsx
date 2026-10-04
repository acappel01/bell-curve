import Heading from "./Heading";
import Html from "../Html";

/**
 * `timeline` blueprint → centered heading + lead, then a vertical rail with
 * dot markers and steps alternating right/left of the rail (Figma 337-1549).
 * Data: heading, lead, mark_image, steps [{title, meta, body,
 * bullets [{text}]}]. Mobile-first: left rail with all steps stacked;
 * ≥992px the rail centers and steps alternate sides (1st right, 2nd left…).
 */
export default function TimelineSection({ section }) {
  const data = section.data ?? {};
  const steps = (data.steps ?? []).filter((step) => step?.title || step?.body);

  if (!steps.length && !data.heading) {
    return null;
  }

  return (
    <section id={section.anchor || undefined} className="timeline sx-section">
      <div className="timeline__inner sx-content">
        {data.heading || data.lead ? (
          <header className="timeline__header">
            {data.heading ? (
              <Heading className="timeline__heading" heading={data.heading} />
            ) : null}
            <Html as="p" inline className="timeline__lead" value={data.lead} />
          </header>
        ) : null}

        <div className="timeline__rail-wrap">
          {data.mark_image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="timeline__mark"
              src={data.mark_image.url}
              alt={data.mark_image.alt || ""}
            />
          ) : null}

          <ol className="timeline__steps">
            {steps.map((step, index) => {
              const bullets = (step.bullets ?? []).filter(
                (bullet) => bullet?.text,
              );

              return (
                <li
                  key={index}
                  className={`timeline__step timeline__step--${
                    index % 2 === 0 ? "right" : "left"
                  }`}
                >
                  <span className="timeline__dot" aria-hidden />
                  <div className="timeline__card">
                    {step.title ? (
                      <Heading as="h3" className="timeline__title" heading={step.title} />
                    ) : null}
                    {step.meta ? (
                      <Html as="p" inline className="timeline__meta" value={step.meta} />
                    ) : null}
                    <Html className="timeline__body" value={step.body} />
                    {bullets.length ? (
                      <ul className="timeline__bullets">
                        {bullets.map((bullet, i) => (
                          <Html as="li" inline key={i} value={bullet.text} />
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
