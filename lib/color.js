/**
 * WCAG colour maths shared by the layout (button label colour per palette
 * entry) and the style tile (contrast labels on each swatch).
 */

/**
 * `[r, g, b]` (0-255) from #rgb, #rrggbb or rgb()/rgba(). Null when the value
 * cannot be parsed. These are the shapes the palette sanitizer in
 * app/layout.js lets through.
 */
export function parseColor(color) {
  const value = String(color).trim();
  let channels;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    channels = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
  } else {
    const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (!rgb) {
      return null;
    }
    channels = rgb.slice(1, 4).map(Number);
  }

  return channels.every((channel) => Number.isFinite(channel)) ? channels : null;
}

/** WCAG relative luminance, with the sRGB gamma expansion. Null if unparseable. */
export function luminance(color) {
  const channels = parseColor(color);
  if (!channels) {
    return null;
  }

  const [r, g, b] = channels.map((channel) => {
    const c = channel / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, e.g. 4.52. Null if either is unparseable. */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) {
    return null;
  }

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Black or white, whichever is readable on `color`. Null when the value cannot
 * be parsed.
 *
 * The two candidate CONTRAST RATIOS are compared directly rather than testing
 * luminance against a midpoint. A 0.5 threshold is the intuitive version and
 * it is wrong: bronze (#B18D68) has luminance 0.29, so a midpoint test picks
 * white — but black gives 6.9:1 against it and white only 3.1:1. The crossover
 * is at luminance 0.1791, not 0.5, because the WCAG ratio is not linear in
 * luminance. The naive `(r+g+b)/3` brightness test is worse still: it picks
 * white on mid-greens and black on mid-blues.
 */
export function contrastColor(color) {
  const value = contrastRatio(color, "#000000");
  if (value === null) {
    return null;
  }

  return value >= contrastRatio(color, "#ffffff") ? "#000000" : "#ffffff";
}
