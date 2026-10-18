import Html from "@/components/Html";
import CtaLink from "./CtaLink";
import SectionHeader from "./SectionHeader";

/**
 * Text band (backend type `text-block`): eyebrow, heading, rich `body`,
 * `alignment` (left | center), `theme` (light | cream | dark) and an optional
 * `link_label` / `link_url`.
 *
 * The handoff keeps boundaries short: one clear sentence linking onward, not
 * stacked disclaimers. That is this section's main job (Health Map vs.
 * clinical intake, what Membership does not include), plus short prose such
 * as the founder story.
 */
export default function ProseSection({ section }) {
  const data = section.data ?? {};
  const theme = ["cream", "dark"].includes(data.theme) ? data.theme : "light";
  const align = data.alignment === "center" ? "center" : "left";

  if (!data.heading && !data.body) {
    return null;
  }

  return (
    <section className={`bch-prose bch-prose--${theme} bch-prose--${align}`} id={section.anchor || undefined}>
      <div className="bch-container bch-prose__inner">
        <SectionHeader data={data} size="md" align={align} />
        <Html value={data.body} className="bch-prose__body" />
        <CtaLink label={data.link_label} url={data.link_url} variant="link" />
      </div>
    </section>
  );
}
