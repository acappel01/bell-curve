/**
 * `highlight-banner` blueprint → slim icon + text trust band (Figma
 * 1268-2795). Data: items [{icon_class, icon: {url,..}|null, text}], icon_placement
 * left|top, per_row "2".."6" (desktop column count), bordered, theme
 * light|dark|cream. Authored line breaks in text are preserved.
 */
export default function HighlightBannerSection({ section }) {
  const data = section.data ?? {};
  const items = (data.items ?? []).filter((item) => item?.text);

  if (!items.length) {
    return null;
  }

  // COLUMNS NEVER EXCEED THE ITEMS. The grid is equal-width tracks, so asking
  // for five columns with four highlights left a dead fifth track and pushed
  // everything to the left — which reads as "the spacing is broken" rather
  // than "you asked for a column you did not fill". Capping it means the row
  // always divides evenly, which is what the band this replaced did with
  // `repeat(4, auto)` + space-between.
  const requested = Number(data.per_row) || items.length;
  const perRow = Math.max(1, Math.min(requested, items.length));

  const classes = [
    "highlight-banner",
    "sx-section",
    `highlight-banner--${data.theme || "cream"}`,
    data.icon_placement === "top" ? "highlight-banner--icon-top" : "",
    data.bordered ? "highlight-banner--bordered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section id={section.anchor || undefined} className={classes}>
      <div className="highlight-banner__grid sx-content" style={{ "--per-row": perRow }}>
        {items.map((item, index) => (
          <div className="highlight-banner__item" key={index}>
            {/* An icon CLASS wins over an image. Most of these are icons; the
                image picker stays for the occasional piece of real artwork,
                and an operator who has set both meant the icon. */}
            {item.icon_class ? (
              <i className={`highlight-banner__glyph ${item.icon_class}`} aria-hidden="true" />
            ) : item.icon?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="highlight-banner__icon"
                src={item.icon.url}
                alt={item.icon.alt || ""}
              />
            ) : null}
            <Html as="p" inline className="highlight-banner__text" value={item.text} />
          </div>
        ))}
      </div>
    </section>
  );
}

import Html from "../Html";