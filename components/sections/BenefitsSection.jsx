import Html from "../Html";
import Heading from "./Heading";

/**
 * `benefits-him` / `benefits-her` blueprints → dark pitch-plus-grid section.
 * Same data shape (eyebrow, heading, emphasis, lead, image, image_alt,
 * cta_label, cta_url, benefits.* {category, pill, title, body}); the -her
 * variant mirrors the layout (cards left, pitch right) on desktop.
 */
export default function BenefitsSection({ section }) {
  const data = section.data ?? {};
  const benefits = (data.benefits ?? []).filter((benefit) => benefit?.title);
  const mirrored = section.type === "benefits-her";

  if (!benefits.length && !data.heading) {
    return null;
  }

  return (
    <section
      id={section.anchor || undefined}
      className={`ben-section sx-section${mirrored ? " ben-section--mirrored" : ""}`}
    >
      <div className="ben-inner sx-content">
        <div className="ben-pitch">
          <Html as="p" inline className="ben-eyebrow" value={data.eyebrow} />
          <Heading className="ben-heading" heading={data.heading} emphasis={data.emphasis} />
          <Html as="p" inline className="ben-lead" value={data.lead} />
          {data.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="ben-image"
              src={data.image.url}
              alt={data.image_alt || data.image.alt || ""}
              width={data.image.width || undefined}
              height={data.image.height || undefined}
            />
          ) : null}
          {data.cta_label ? (
            <a className="ben-cta" href={data.cta_url || "#"}>
              {data.cta_label}
            </a>
          ) : null}
        </div>

        {benefits.length ? (
          <div className="ben-grid">
            {benefits.map((benefit, index) => (
              <article className="ben-card" key={`${benefit.title}-${index}`}>
                <div className="ben-cardHeader">
                  <Html as="span" inline className="ben-category" value={benefit.category} />
                  <Html as="span" inline className="ben-pill" value={benefit.pill} />
                </div>
                <Heading as="h3" className="ben-title" heading={benefit.title} />
                <Html className="ben-body" value={benefit.body} />
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
