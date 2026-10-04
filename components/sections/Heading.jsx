import { toInlineHtml } from "@/lib/richText";

/**
 * Shared heading renderer for the blueprint `heading` + `emphasis` pair —
 * most backend sections split their heading so the tail can be styled
 * (italic/accent) independently.
 *
 * Headings honour admin-authored inline HTML, so an operator can force a
 * line break (`The Operating System<br />for Longevity`) or emphasise a run
 * of words from the admin without a code change.
 *
 * The value is flattened to inline markup first: this component picks the
 * element (an <h1> for a hero, an <h2> for a section, an <h3> for a card),
 * so a block node arriving from older content would nest inside it and
 * corrupt the document outline. The backend strips those on save; this is
 * the local half of the same guarantee.
 *
 * Heading and emphasis are composed into one HTML string because React
 * forbids mixing dangerouslySetInnerHTML with children on one element.
 */
export default function Heading({ as: Tag = "h2", className, heading, emphasis }) {
  const main = toInlineHtml(heading);
  const accent = toInlineHtml(emphasis);

  if (main === null && accent === null) {
    return null;
  }

  const parts = [main, accent ? `<em>${accent}</em>` : null].filter(Boolean);

  return <Tag className={className} dangerouslySetInnerHTML={{ __html: parts.join(" ") }} />;
}
