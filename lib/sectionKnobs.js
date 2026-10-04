/**
 * The operator's presentation knobs, shared by sections and by the typed
 * sub-blocks inside them.
 *
 * Lifted out of SectionRenderer when sub-blocks landed. The JS is genuinely
 * the same at both levels — a knob means the same thing on a child as on its
 * parent, and one that didn't would be exactly the "control that lies to the
 * operator" shape this system keeps removing.
 *
 * THE CSS IS NOT THE SAME, which is why every helper here takes a PREFIX.
 * `.sx-section` is a descendant selector under `.site-main`, and the width /
 * inset / align rules target their content containers as descendants too. A
 * child wearing the parent's classes would therefore bleed out of its
 * parent's column by the page gutter and inherit the parent's inset twice
 * over. Children get their own vocabulary (`sxb-*`), single-sourcing the
 * token => px scale through the SCSS maps rather than through these classes.
 *
 * Backend contract: prx-backend `docs/frontend/dev.md` §4b (knobs) and §4c
 * (sub-blocks).
 */

/** Wrapper class + custom-property prefix for a top-level section. */
export const SECTION_PREFIX = "sx";

/** Wrapper class + custom-property prefix for a typed child block. */
export const BLOCK_PREFIX = "sxb";

/**
 * Shared "Layout & spacing" knobs (admin: SectionFormBuilder::layoutSection).
 *
 * The width tokens are SEMANTIC, and this app owns what they measure: the
 * backend ships to more than one frontend and may not carry a pixel value of
 * the Atlas theme. `abstracts/_layout-tokens.scss` holds the token => px map
 * (it moved out of `_layout-frame.scss` when sub-blocks landed, so the `sx-*`
 * and `sxb-*` vocabularies could not drift into two scales), and the whole
 * scale can be retuned there without an admin edit.
 *
 * Values are a fixed vocabulary, so anything an older payload carries that
 * isn't in the allow-list is ignored rather than emitting a dead class.
 */
const LAYOUT_CLASSES = {
  content_inset: {
    suffix: "inset",
    values: ["flush", "none", "sm", "md", "lg", "xl"],
    responsive: true,
    // `flush` counter-bleeds the PAGE gutter. A child block sits inside its
    // parent's content column and is not adjacent to the screen edge, so the
    // value has nothing to cancel there. The admin already withholds the
    // option from a block's form; this makes a hand-edited payload inert too,
    // rather than emitting a class no sub-block stylesheet defines.
    sectionOnly: ["flush"],
  },
  content_width: {
    suffix: "width",
    values: ["narrow", "medium", "wide", "xwide", "full"],
  },
  content_align: {
    suffix: "align",
    values: ["left", "center", "right"],
    responsive: true,
  },
  media_width: { suffix: "media", values: ["contained", "full"] },
  // Replaces the retired `extra_padding`, which drove both edges from one
  // token. Two knobs, so "generous above, tight below" is finally sayable.
  style_padding_top: {
    suffix: "pad-top",
    values: ["none", "sm", "md", "lg"],
    responsive: true,
  },
  style_padding_bottom: {
    suffix: "pad-bottom",
    values: ["none", "sm", "md", "lg"],
    responsive: true,
  },
  // Width only sets the custom property; the BORDER ITSELF is drawn by the
  // `-border` marker that the colour emits in styleKnobs(). A width with no
  // colour therefore paints nothing — the safe direction, since the
  // alternative is a mystery black frame — and the admin says so in the
  // control's own hint. It does NOT hide the control behind the colour: a
  // section with a stored width and no colour would put that value out of
  // reach. (This comment used to quote helper text that promised the control
  // was hidden; the text was wrong and was reworded 2026-08-26.)
  style_border_width: { suffix: "bw", values: ["none", "sm", "md", "lg"] },
  style_radius: { suffix: "radius", values: ["none", "sm", "md", "lg"] },
};

/**
 * The per-breakpoint override tiers, in emission order.
 *
 * Overrides arrive as FLAT SUFFIXED KEYS — `content_align_md`, not a nested
 * object under `content_align`. The base key is the value at every width, so
 * it is the MOBILE value, and a payload with no suffixed keys behaves exactly
 * as it did before they existed.
 *
 * The shape costs the backend nothing: its `has_content` classifier skips
 * presentation keys BY NAME, so a suffixed key becomes presentation by being
 * listed and nothing has to learn a new shape. Names are Bootstrap 5.3's,
 * matching `_breakpoints.scss`, so an Atlas knob and a `d-*` utility switch at
 * the same width on the same element.
 *
 * A NULL AT A TIER MEANS "INHERIT THE WIDTH BELOW", NEVER "RESET" — which is
 * why every size scale above carries an explicit `none`.
 */
const TIERS = ["md", "lg"];

/**
 * A palette entry name, validated before it is interpolated into a custom
 * property name. The vocabulary can't be an allow-list the way the layout
 * tokens are — colours are named by the operator and change without a deploy
 * — so the shape is checked instead and anything else is dropped.
 */
const PALETTE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Layout knob classes for a payload, or null when none resolve.
 *
 * A responsive family emits up to four classes: a tier-independent MARKER
 * (`sx-align`), plus a setter for each tier that resolved (`sx-align--center`,
 * `sx-align-md--left`). The marker is what the consumer rule in
 * `_layout-frame.scss` is scoped to, and it has to exist separately from the
 * setters — a section that sets ONLY a tablet override carries no base class,
 * so a consumer guarded on the list of base classes would compile cleanly and
 * do nothing at all. That is a silent failure of exactly the kind this
 * vocabulary keeps designing out, and the marker is what prevents it.
 *
 * Non-responsive families keep the older arrangement, where the value class is
 * both setter and guard: there is no tier that can exist without a base.
 */
export function layoutClassName(data, prefix = SECTION_PREFIX) {
  const classes = [];

  for (const [field, config] of Object.entries(LAYOUT_CLASSES)) {
    const { suffix, values, responsive, sectionOnly } = config;

    const allowed =
      sectionOnly && prefix !== SECTION_PREFIX
        ? values.filter((value) => !sectionOnly.includes(value))
        : values;

    const resolve = (key) => {
      const value = data?.[key];

      return allowed.includes(value) ? value : null;
    };

    const base = resolve(field);
    const tiers = responsive
      ? TIERS.map((tier) => [tier, resolve(`${field}_${tier}`)])
      : [];

    if (base === null && tiers.every(([, value]) => value === null)) {
      continue;
    }

    if (responsive) {
      classes.push(`${prefix}-${suffix}`);
    }

    if (base !== null) {
      classes.push(`${prefix}-${suffix}--${base}`);
    }

    for (const [tier, value] of tiers) {
      if (value !== null) {
        classes.push(`${prefix}-${suffix}-${tier}--${value}`);
      }
    }
  }

  return classes.length ? classes.join(" ") : null;
}

/**
 * Admin "Style" knobs — background colour, background image, text colour.
 *
 * Each emits TWO things, and both matter:
 *   - a marker CLASS, which is what scopes the rule in _layout-frame.scss.
 *     Without it the declaration would exist on every section and blank the
 *     background of any partial that paints its own band.
 *   - an inline CUSTOM PROPERTY holding the value.
 *
 * Colours indirect through `--palette-{name}` (emitted on <html> by
 * app/layout.js) rather than carrying a hex, so retuning a palette colour in
 * the admin moves every section using it.
 *
 * The keys are namespaced `style_*` because the bare names collide with real
 * authored fields: `background_image` is a content field on hero, cta-banner
 * and image-callout-banner, and reading that key here painted a section's own
 * image a second time as a band background. The backend enforces the prefix
 * (LayoutFieldCollisionTest); do not strip it to make the key read nicer.
 */
export function styleKnobs(data, prefix = SECTION_PREFIX) {
  const classes = [];
  const style = {};

  const background = data?.style_background_color;
  if (typeof background === "string" && PALETTE_NAME.test(background)) {
    classes.push(`${prefix}-bg`);
    style[`--${prefix}-bg`] = `var(--palette-${background})`;

    // SECTION-ONLY, and only when a colour was chosen.
    //
    // A block has no full-bleed band to contain — its background already stops
    // at its own box — so the knob is meaningless there and `_sub-blocks.scss`
    // defines no rule for it. Emitting the class anyway would give an operator
    // a control that saves and changes nothing, which is the defect class this
    // work exists to remove. Same reasoning as `flush` above; the admin
    // withholds it from a block's form and this makes a hand-edited payload
    // inert too.
    if (prefix === SECTION_PREFIX && data?.style_background_width === "contained") {
      classes.push(`${prefix}-bgw--contained`);
    }
  }

  const text = data?.style_text_color;
  if (typeof text === "string" && PALETTE_NAME.test(text)) {
    classes.push(`${prefix}-text`);
    style[`--${prefix}-text`] = `var(--palette-${text})`;
  }

  const accent = data?.style_accent_color;
  if (typeof accent === "string" && PALETTE_NAME.test(accent)) {
    classes.push(`${prefix}-accent`);
    style[`--${prefix}-accent`] = `var(--palette-${accent})`;
  }

  // ONE stored name, TWO properties. The operator picks a fill; the label
  // colour is derived from that fill's luminance by app/layout.js, which is
  // the only place holding the actual hex. Two selects would let someone pick
  // sand-on-white — the unreadable pair this knob exists to make impossible.
  //
  // If the palette colour could not be parsed, layout.js emits no `-contrast`
  // companion. The substitution is then invalid, so `--{prefix}-btn-text` is
  // guaranteed-invalid too and the partial's own `var(..., <original>)`
  // fallback fires: the fill follows the knob and the label keeps its designed
  // colour. Degrading, never unreadable.
  const button = data?.style_button_color;
  if (typeof button === "string" && PALETTE_NAME.test(button)) {
    classes.push(`${prefix}-btn`);
    style[`--${prefix}-btn-bg`] = `var(--palette-${button})`;
    style[`--${prefix}-btn-text`] = `var(--palette-${button}-contrast)`;
  }

  // The MARKER for the border, and the reason a width alone draws nothing.
  // Border and radius paint the same box the background does, so both join
  // the wrapper's bleed selector list in _layout-frame.scss — which is why
  // that bleed had to be fixed first (c43e9a7): a border framing a band that
  // stopped a gutter short of the viewport edge would have been the same bug,
  // drawn in a colour the operator picked on purpose.
  const border = data?.style_border_color;
  if (typeof border === "string" && PALETTE_NAME.test(border)) {
    classes.push(`${prefix}-border`);
    style[`--${prefix}-border-color`] = `var(--palette-${border})`;
  }

  // Arrives resolved as { id, url, alt, width, height } — the transformer
  // unions this key into its image handling (LayoutFields::IMAGE_KEYS),
  // because the Style panel is injected into every type and so appears in no
  // blueprint's field map. A bare id here means that union was lost.
  //
  // This is the SECTION'S BACKDROP, not its content imagery: hero and
  // image-callout-banner render their own images through their components.
  const image = data?.style_background_image?.url;
  if (typeof image === "string" && image) {
    classes.push(`${prefix}-bgimg`);
    // A quote or backslash in a filename would otherwise close the url()
    // early; the value lands in a style attribute, not a stylesheet.
    style[`--${prefix}-bg-image`] =
      `url("${image.replace(/["\\]/g, encodeURIComponent)}")`;
  }

  return { classes, style };
}

/**
 * Everything a knob wrapper needs: the joined class list and the inline
 * custom properties, or `className: null` when the operator set nothing.
 *
 * Callers wrap ONLY when className is non-null. The backend merges a per-type
 * design default so in practice most sections wrap, but a type that declares
 * no default and an operator who set nothing must still render exactly the
 * DOM they always did.
 */
export function knobs(data, prefix = SECTION_PREFIX) {
  const layout = layoutClassName(data, prefix);
  const { classes, style } = styleKnobs(data, prefix);
  const className = [layout, ...classes].filter(Boolean).join(" ") || null;

  return {
    className,
    style: Object.keys(style).length ? style : undefined,
  };
}

/**
 * Fallback emptiness check, used only when a payload predates the backend's
 * `has_content` flag. It cannot tell a structural flag from authored copy —
 * `theme: "light"` reads as content here — which is exactly why the backend
 * computes the real answer. See prx-backend `docs/frontend/dev.md` §4.
 */
export function isContentEmpty(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === false
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isContentEmpty);
  }

  if (typeof value === "object") {
    return Object.values(value).every(isContentEmpty);
  }

  return false;
}
