/**
 * Detail-page presentation object — the single knob set for how a product /
 * stack detail page composes its blocks. Builder-ready: when the backend
 * ships a per-record `detail_layout` field it feeds straight into
 * `normalizePresentation`; explicit props win over it, defaults fill the rest.
 *
 * Shape:
 *   highlightsPosition — "above" (default) / "below" / "none": where the
 *     record's highlights render relative to the Add to Cart button.
 *   accordions.placement — "side" (info column, current default) or "below"
 *     (full-width under the gallery/info row, above the trust band).
 *   pairWith — mini-slider per-view counts { desktop: 1–4, mobile: 1–2 }.
 *     Defaults depend on placement: the narrow side column fits 2-up, the
 *     full-width below block fits 4-up.
 */

const PLACEMENTS = ["side", "below"];
const TEMPLATES = ["classic", "conversion"];
const RAILS = ["related", "stacks", "associated"];

// Where the Merchandising highlights render in the buy box. `none` hides them
// without the operator deleting the lines — a real third answer, not the
// absence of a choice, same as the rails vocabulary.
const HIGHLIGHT_POSITIONS = ["above", "below", "none"];

export function normalizePresentation(detailLayout, overrides) {
  const merged = { ...(detailLayout ?? {}), ...(overrides ?? {}) };

  const placement = PLACEMENTS.includes(merged.accordions?.placement)
    ? merged.accordions.placement
    : "side";

  const pairWithDefaults =
    placement === "below" ? { desktop: 4, mobile: 2 } : { desktop: 2, mobile: 1 };

  // The backend detail_layout field is snake_case (pair_with); camelCase is
  // kept for explicit component-prop overrides.
  const pairWith = merged.pair_with ?? merged.pairWith;

  // "NO RAILS" IS THE `none` TOKEN, NEVER AN EMPTY LIST — and the difference
  // is not pedantry. An empty list is exactly what Filament submits for a
  // CheckboxList nobody touched, so reading `[]` as "the operator chose none"
  // meant that editing a subtitle and saving would silently delete a page's
  // rails. The backend prunes empty values away for that reason, so an empty
  // or missing list here means "never chosen" and takes the default.
  //
  // Same idiom as the section spacing scale, where `none` is deliberately not
  // redundant with leaving a knob unset.
  const chosen = Array.isArray(merged.rails) ? merged.rails : [];
  const railsOff = chosen.includes("none");
  const rails = chosen.filter((rail) => RAILS.includes(rail));

  return {
    template: TEMPLATES.includes(merged.template) ? merged.template : "classic",
    // Above the Add to Cart button by default: the credibility lines earn
    // their keep in the moment before the click. Operators who want them as a
    // post-click reassurance can move them.
    highlightsPosition: HIGHLIGHT_POSITIONS.includes(merged.highlights_position)
      ? merged.highlights_position
      : "above",
    accordions: { placement },
    pairWith: {
      desktop: intInRange(pairWith?.desktop, 1, 4) ?? pairWithDefaults.desktop,
      mobile: intInRange(pairWith?.mobile, 1, 2) ?? pairWithDefaults.mobile,
    },
    // `none` wins over any rail ticked alongside it: the operator asked for
    // nothing, and rendering a rail anyway would be the control lying.
    rails: railsOff ? [] : rails.length ? rails : ["related"],
  };
}

function intInRange(value, min, max) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < min || number > max) {
    return null;
  }

  return number;
}
