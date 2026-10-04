/**
 * `html-block` blueprint → operator markup, rendered verbatim.
 *
 * The escape hatch for a layout no section type provides. It exists because
 * the rich-text fields cannot do this: a rich editor treats pasted markup as
 * TEXT, so it stores escaped entities and the page ends up displaying its own
 * source. This block takes the markup as source and renders it as markup.
 *
 * **Injected without sanitisation, deliberately.** Same trust model as the
 * operator's `custom_css` and `custom_head_scripts` in the root layout:
 * permission-gated content from this install's own admin. Never route
 * user-generated content here.
 *
 * It wears the layout contract, so the operator's width, inset, padding and
 * background knobs all apply — the markup inside sits in the same column every
 * other section's content does, rather than escaping the page frame.
 */

/**
 * A stable class derived from the block's own CSS.
 *
 * Deterministic so the server and the client agree — a random id would
 * hydrate to a different class than it rendered with. FNV-1a, because the only
 * requirement is that two different stylesheets on one page do not collide.
 */
function scopeClass(css) {
  let hash = 0x811c9dc5;

  for (let i = 0; i < css.length; i += 1) {
    hash ^= css.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `hb-${hash.toString(36)}`;
}

/**
 * Confines the operator's CSS to this block by nesting it under the scope
 * class.
 *
 * Their stylesheets use names like `.section`, `.content`, `.layout` and
 * `.divider` — generic enough that an unscoped rule would repaint half the
 * site. Native CSS nesting does the confining without having to parse and
 * rewrite every selector.
 *
 * `:root` is rewritten to `&` so custom properties still resolve: a pasted
 * design that declares `--muted` on `:root` and reads it with `var(--muted)`
 * would otherwise define it somewhere the scope cannot see.
 */
function scopedCss(css, className) {
  return `.${className} {\n${css.replace(/:root\b/g, "&")}\n}`;
}

export default function HtmlBlockSection({ section }) {
  const data = section.data ?? {};
  const html = typeof data.html === "string" ? data.html.trim() : "";

  if (!html) {
    return null;
  }

  const css = typeof data.css === "string" ? data.css.trim() : "";
  const scope = css ? scopeClass(css) : null;

  // Defaults ON. Bare tags otherwise inherit the theme's reset — every margin
  // zero, headings at hero scale, body at the 14px UI size — so a pasted
  // document runs together with no rhythm at all. Opting out is for a paste
  // whose own CSS styles every tag it uses.
  const useSiteTypography = data.use_site_typography !== false;

  const classes = ["html-block__content", "sx-content", useSiteTypography ? "rich-text" : "", scope]
    .filter(Boolean)
    .join(" ");

  return (
    <section id={section.anchor || undefined} className="html-block sx-section">
      {css ? (
        <style dangerouslySetInnerHTML={{ __html: scopedCss(css, scope) }} />
      ) : null}
      <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
