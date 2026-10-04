import Heading from "./Heading";
import Html from "../Html";

/**
 * `text-block` blueprint → generic prose section. Data: eyebrow, heading,
 * body (rich editor HTML), alignment (left|center), theme (light|dark|cream).
 *
 * The workhorse for legal and long-form pages (privacy policy, terms, HIPAA)
 * where the whole point is admin-authored copy, so `body` renders through
 * the shared Html component rather than as escaped text.
 *
 * The emptiness rule is enforced centrally now — SectionRenderer drops any
 * section the backend reports as having no authored content, so `alignment`
 * and `theme` no longer make a scaffold look filled in. The guard below stays
 * as an ordinary required-field check: this section is nothing but its copy,
 * so with none of the three it has no shell worth rendering.
 */
export default function TextBlockSection({ section }) {
  const data = section.data ?? {};

  if (!data.eyebrow && !data.heading && !data.body) {
    return null;
  }

  const theme = ["light", "dark", "cream"].includes(data.theme) ? data.theme : "light";
  const alignment = data.alignment === "center" ? "center" : "left";

  return (
    <section
      id={section.anchor || undefined}
      className={`text-block sx-section text-block--${theme} text-block--${alignment}`}
    >
      <div className="text-block__inner sx-content">
        <Html as="p" inline className="text-block__eyebrow" value={data.eyebrow} />
        <Heading className="text-block__heading" heading={data.heading} />
        <Html className="text-block__body" value={data.body} />
      </div>
    </section>
  );
}
