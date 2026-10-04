import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import SectionCta from "@/components/sections/SectionCta";
import { toPlainText } from "@/lib/richText";

/**
 * `quiz-cta` blueprint → the lead-magnet ingress: the block that starts the
 * health-goal quiz, droppable on any page.
 *
 * Data: eyebrow, heading, heading_level h1|h2, body, cta_* (SectionCta),
 * cta_icon (sanitised SVG markup), cta_subtext, badges [{icon, label}],
 * media {url, alt, …}, media_caption.
 *
 * Three things here are deliberate:
 *
 * - **No background field.** Every section already carries
 *   `style_background_color` and `style_background_image` in the Style panel,
 *   and `background_image` as a content field is the collision the layout
 *   knobs were namespaced `style_*` to end. The operator sets the band from
 *   the knob; this component only reads what is on top of it.
 * - **`heading_level` is a knob, not a guess.** This section is designed to
 *   lead a page but can also sit mid-page, and two H1s read as two documents
 *   to a crawler. The operator decides, with the reason in the field's help.
 * - **The SVG comes from the backend already sanitised** (`SvgSanitizer`, on
 *   the `svg` field kind), which is the only reason it is injected at all.
 *   It is built into an element HERE and handed to `SectionCta` as a node, so
 *   that component never has to trust a string.
 */
export default function QuizCtaSection({ section }) {
  const data = section.data ?? {};

  // The headline carries the whole section — without it there is nothing to
  // click toward, so an empty scaffold renders nothing rather than a stray
  // button on a live page.
  if (!toPlainText(data.heading)) {
    return null;
  }

  const badges = (data.badges ?? []).filter((badge) => badge?.label);
  const media = data.media ?? null;
  const headingLevel = data.heading_level === "h1" ? "h1" : "h2";

  const ctaIcon = data.cta_icon ? (
    <span
      className="quiz-cta__cta-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: data.cta_icon }}
    />
  ) : null;

  // Without an image the two-column split would reserve half the band for
  // nothing and squeeze the copy into a column it does not need. The modifier
  // collapses it rather than the SCSS guessing from an empty child.
  const classes = ["quiz-cta", "sx-section", media?.url ? "" : "quiz-cta--no-media"]
    .filter(Boolean)
    .join(" ");

  return (
    <section id={section.anchor || undefined} className={classes}>
      <div className="quiz-cta__wrap sx-content">
        <div className="quiz-cta__lede">
          {toPlainText(data.eyebrow) ? (
            <p className="quiz-cta__eyebrow">
              <span className="quiz-cta__dot" aria-hidden="true" />
              <Html as="span" inline value={data.eyebrow} />
            </p>
          ) : null}

          <Heading
            as={headingLevel}
            className="quiz-cta__title"
            heading={data.heading}
          />

          <Html value={data.body} className="quiz-cta__body" />

          {data.cta_label ? (
            <p className="quiz-cta__actions">
              <SectionCta data={data} className="quiz-cta__cta" icon={ctaIcon} />
            </p>
          ) : null}

          {toPlainText(data.cta_subtext) ? (
            <Html as="p" inline className="quiz-cta__note" value={data.cta_subtext} />
          ) : null}

          {badges.length ? (
            <ul className="quiz-cta__badges">
              {badges.map((badge, index) => (
                // Badges are authored copy with no id of their own, and the
                // list is render-only — nothing reorders it.
                // eslint-disable-next-line react/no-array-index-key
                <li className="quiz-cta__badge" key={index}>
                  {badge.icon ? (
                    <span
                      className="quiz-cta__badge-icon"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: badge.icon }}
                    />
                  ) : null}
                  <Html as="span" inline value={badge.label} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {media?.url ? (
          <div className="quiz-cta__stage">
            <span className="quiz-cta__ring" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="quiz-cta__media"
              src={media.url}
              alt={toPlainText(media.alt) || ""}
              width={media.width || undefined}
              height={media.height || undefined}
            />
            {toPlainText(data.media_caption) ? (
              <span className="quiz-cta__seal">
                <Html as="span" inline value={data.media_caption} />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
