import Html from "../Html";
import { toPlainText } from "@/lib/richText";

import Heading from "./Heading";
import { initials } from "./support";

/** Pills render two per row, matching the theme's dh-badgeRow pairs. */
function chunkPairs(items) {
  const rows = [];

  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return rows;
}

/**
 * `physicians` blueprint → theme "DrHolland" card, one per physician. Data:
 * theme "light"|"dark" (dark: near-black panel, light text, translucent
 * badge pills — Figma 1073-8788), optional header (eyebrow, heading,
 * heading_emphasis, lead), physicians.* (name, title, specialty, image,
 * image_alt, bio, badges[]), optional trust_badges.* {icon, label} strip.
 */
export default function PhysiciansSection({ section }) {
  const data = section.data ?? {};
  const physicians = (data.physicians ?? []).filter((p) => p?.name);
  const trustBadges = (data.trust_badges ?? []).filter((b) => b?.label);

  if (!physicians.length) {
    return null;
  }

  return (
    <section
      id={section.anchor || undefined}
      className={`dh-section sx-section${data.theme === "dark" ? " dh-section--dark" : ""}`}
    >
      <div className="dh-inner sx-content">
        {data.heading || data.eyebrow ? (
          <header className="dh-header">
            <Html as="p" inline className="dh-sectionEyebrow" value={data.eyebrow} />
            <Heading
              className="dh-sectionHeading"
              heading={data.heading}
              emphasis={data.heading_emphasis}
            />
            <Html as="p" inline className="dh-lead" value={data.lead} />
          </header>
        ) : null}

        {physicians.map((physician, index) => (
          <article className="dh-card" key={`${physician.name}-${index}`}>
            <div
              className="dh-photoWrapper"
              role={physician.image?.url ? "img" : undefined}
              aria-label={
                physician.image?.url
                  ? physician.image_alt || toPlainText(physician.name)
                  : undefined
              }
            >
              {physician.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="dh-photo lazyload"
                  src={physician.image.url}
                  alt={physician.image_alt || physician.image.alt || physician.name}
                />
              ) : (
                <span className="dh-photoInitials" aria-hidden="true">
                  {initials(physician.name)}
                </span>
              )}
            </div>

            <div className="dh-content">
              <Html as="p" inline className="dh-eyebrow" value={physician.title} />
              <Heading className="dh-heading" heading={physician.name} />

              <div className="dh-textGroup">
                {physician.specialty ? (
                  <Html as="p" inline className="dh-subheading" value={physician.specialty} />
                ) : null}
                <Html className="dh-description" value={physician.bio} />
              </div>

              {physician.badges?.length ? (
                <div className="dh-badges">
                  {chunkPairs(physician.badges.filter(Boolean)).map((row, rowIndex) => (
                    <div className="dh-badgeRow" key={rowIndex}>
                      {row.map((badge) => (
                        <Html
                          as="span"
                          inline
                          className="dh-badge"
                          key={badge}
                          value={badge}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {trustBadges.length ? (
          <div className="dh-badges">
            <div className="dh-badgeRow">
              {trustBadges.map((badge, index) => (
                <span className="dh-badge" key={`${badge.label}-${index}`}>
                  {badge.icon ? <span className="dh-badgeIcon">{badge.icon}</span> : null}
                  <Html as="span" inline value={badge.label} />
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
