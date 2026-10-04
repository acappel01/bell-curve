import { toHtml, toInlineHtml } from "@/lib/richText";

/**
 * Renders admin-authored copy, which always arrives as HTML.
 *
 * Two modes, matching the two field kinds the backend emits:
 *
 * - default (prose) — the value carries its own blocks (paragraphs, H2/H3,
 *   lists), so it gets a container of its own and the `rich-text` class that
 *   styles them.
 * - `inline` — the value belongs inside an element this app chooses (a lead
 *   paragraph, a card label, a list item). Block markup is flattened to
 *   inline, so nesting stays valid, and no `rich-text` class is added because
 *   there are no blocks to style.
 *
 * Renders nothing when the value is empty, so callers don't need their own
 * guard around it.
 *
 * Trust model: permission-gated admin HTML, the same path as FAQ answers and
 * custom scripts — never route user-generated content through this component.
 */
export default function Html({ value, className, as: Tag = "div", inline = false }) {
  const html = inline ? toInlineHtml(value) : toHtml(value);

  if (html === null) {
    return null;
  }

  const classes = inline ? className : [className, "rich-text"].filter(Boolean).join(" ");

  return <Tag className={classes || undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}
