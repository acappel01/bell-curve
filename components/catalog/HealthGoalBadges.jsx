import { toPlainText } from "@/lib/richText";

/**
 * The health-goal chips on a catalog item — "weight loss", "sleep &
 * recovery", what the thing is GOOD FOR.
 *
 * Fed by `health_goals[]` on any catalog payload (product, package, or a
 * relation rail item), which the backend derives for a package from the
 * products inside it unless the operator has overridden it. This component
 * only paints what it is handed.
 *
 * COLOUR IS A PALETTE NAME, NEVER A HEX. `badge_color` resolves through
 * `--palette-{name}`, so retuning that colour in the admin moves every badge
 * using it. The label is NOT a second operator choice — it reads
 * `--palette-{name}-contrast`, the black-or-white companion `app/layout.js`
 * derives from the same hex, so a badge cannot be authored unreadable. This
 * mirrors `style_button_color`; see the handoff before adding a text picker.
 *
 * A goal with no colour renders in the neutral default rather than nothing:
 * the operator tagged the item, and the tag is information even unstyled.
 *
 * Deliberately hook-free so it renders inside server and client trees alike —
 * listing cards are server-rendered but sit inside client sliders.
 *
 * NOT LINKS YET. 27a's goal index (`/goals/{slug}`) is designed but unbuilt,
 * and an anchor now would 404 through the `[...slug]` catch-all. `goalHref`
 * in lib/routes.js is the seam; swap the span for an <a> when the page lands.
 */

/** Palette names reach an inline style attribute — same filter as app/layout.js. */
function safePaletteName(name) {
  if (typeof name !== "string") {
    return null;
  }

  const safe = name.replace(/[^a-z0-9-]/g, "");

  return safe === "" ? null : safe;
}

export default function HealthGoalBadges({ goals, className = "" }) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return null;
  }

  const items = goals
    .map((goal) => {
      // Goal names are an inline rich-text field; markup in an attribute or a
      // chip would print as tags.
      const label = toPlainText(goal?.name);

      return label ? { label, slug: goal?.slug, color: safePaletteName(goal?.badge_color) } : null;
    })
    .filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={`hg-badges ${className}`.trim()}>
      {items.map((item) => (
        <li
          key={item.slug || item.label}
          className={`hg-badge${item.color ? " hg-badge--colored" : ""}`}
          style={
            item.color
              ? {
                  "--hg-bg": `var(--palette-${item.color})`,
                  "--hg-text": `var(--palette-${item.color}-contrast)`,
                }
              : undefined
          }
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}
