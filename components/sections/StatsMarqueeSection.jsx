import Html from "../Html";

/**
 * `stats-marquee` blueprint → auto-scrolling strip of value/label pairs.
 * Data: items.* {value, label}. The list is rendered twice (second copy
 * aria-hidden) so the CSS translateX(-50%) loop is seamless; reduced-motion
 * users get a static wrapped row instead.
 *
 * THE ONE SECTION WITH NO `.sx-content`, and the layout contract says so
 * rather than leaving it to be rediscovered. The track is `width: max-content`
 * and is meant to run past both edges of the band; the element that clips it
 * has to BE the band, so there is no content column to hand the knobs. A
 * masking `.sx-content` was tried and is worse: it would clip the strip at the
 * page gutter while the sand band bled past it, leaving dead colour either
 * side of a marquee that no longer reaches its own edges.
 *
 * Live: the vertical padding knobs (`style_padding_top` / `style_padding_bottom`)
 * and the frame ones — they land on the knob wrapper, not on a content column.
 * Inert by construction: `content_inset`, `content_width`, `content_align`,
 * because this is THE ONE SECTION WITH NO `.sx-content` for them to act on.
 * That is also why a horizontal padding knob was rejected rather than added:
 * it would move this band where content_inset provably cannot, and would move
 * it away from the edges the marquee exists to overflow past.
 */
export default function StatsMarqueeSection({ section }) {
  const data = section.data ?? {};
  const items = (data.items ?? []).filter((item) => item?.value || item?.label);

  if (!items.length) {
    return null;
  }

  const strip = (hidden) => (
    <ul className="sm-strip" aria-hidden={hidden || undefined}>
      {items.map((item, index) => (
        <li className="sm-item" key={`${item.label}-${index}`}>
          <Html as="span" inline className="sm-value" value={item.value} />
          <Html as="span" inline className="sm-label" value={item.label} />
        </li>
      ))}
    </ul>
  );

  return (
    <section id={section.anchor || undefined} className="sm-section sx-section">
      <div className="sm-track">
        {strip(false)}
        {strip(true)}
      </div>
    </section>
  );
}
