import Html from "../Html";
import Heading from "./Heading";
import { initials } from "./support";

/**
 * `story` blueprint → founders story: left-aligned header, 2-card grid of
 * physician bios (round portrait + name + title + gold badge + bio), closing
 * manifesto quote card. Data: eyebrow, heading, emphasis, lead, physicians.*
 * (name, title, badge, image, image_alt, body), pull_quote,
 * pull_quote_attribution.
 */
export default function StorySection({ section }) {
  const data = section.data ?? {};
  const physicians = (data.physicians ?? []).filter((p) => p?.name);

  if (!physicians.length && !data.heading && !data.pull_quote) {
    return null;
  }

  return (
    <section id={section.anchor || undefined} className="story-section sx-section">
      <div className="story-inner sx-content">
        {data.heading || data.eyebrow || data.lead ? (
          <header className="story-header">
            <Html as="p" inline className="story-eyebrow" value={data.eyebrow} />
            <Heading className="story-heading" heading={data.heading} emphasis={data.emphasis} />
            <Html as="p" inline className="story-lead" value={data.lead} />
          </header>
        ) : null}

        {physicians.length ? (
          <div className="story-grid">
            {physicians.map((physician, index) => (
              <article className="story-card" key={`${physician.name}-${index}`}>
                <div className="story-photoWrapper">
                  {physician.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="story-photo"
                      src={physician.image.url}
                      alt={physician.image_alt || physician.image.alt || physician.name}
                    />
                  ) : (
                    <span className="story-photoInitials" aria-hidden="true">
                      {initials(physician.name)}
                    </span>
                  )}
                </div>
                <Heading as="h3" className="story-name" heading={physician.name} />
                <Html as="p" inline className="story-title" value={physician.title} />
                <Html as="span" inline className="story-badge" value={physician.badge} />
                <Html className="story-bio" value={physician.body} />
              </article>
            ))}
          </div>
        ) : null}

        {data.pull_quote ? (
          <div className="story-manifesto">
            <Html as="p" inline className="story-quote" value={data.pull_quote} />
            {data.pull_quote_attribution ? (
              <Html as="p" inline className="story-attribution" value={data.pull_quote_attribution} />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
