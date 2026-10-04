/**
 * A price, formatted for display — 179.99 → "$179.99", 3050 → "$3050".
 *
 * THE CENTS ARE DROPPED WHEN THERE ARE NONE, by the operator's choice
 * (2026-08-31). A catalogue of whole-dollar bundles reads better as "$3050"
 * than "$3050.00", and a price that genuinely has cents still shows them.
 *
 * FORMATTING ONLY, AND THAT SEPARATION IS LOAD-BEARING. Prices are `decimal:2`
 * columns — exact in the database, cast to a JSON number at the API boundary,
 * and formatted here at the very edge. Nothing in this app does arithmetic on
 * money: `subtotal` is computed backend-side, and the only derived figure on a
 * card is a percentage. So this function is free to change how a price READS
 * without any risk to what a visitor is charged.
 *
 * IT HAS NOTHING TO DO WITH prescribe-rx. No price of any kind is sent to that
 * provider — the intake payload carries patient, encounter type, sales org,
 * client and product ids only. Their prices flow INBOUND, into `retail_price` /
 * `sale_price` columns, and never through here.
 */
export function money(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);

  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/**
 * What a catalog card quotes for an item — the ONE rule, shared by the SIX
 * surfaces that render a catalogue card: the listing card
 * (`catalog/cards.jsx`), the recommendation rail
 * (`productDetails/RelationCard`), the Pair With slider
 * (`productDetails/PairWithSlider`), the quick-view modal those cards open
 * (`catalog/QuickViewModal`), the upsell strip in the cart drawer and checkout sidebar
 * (`cart/CartUpsells`), and the matched protocol on the plan page
 * (`plan/PlanReport`). Recovery Stack read "$399.00/mo" on four of the first
 * five and "From $349.00/mo" on the fifth.
 *
 * THE SIXTH ARRIVED WITH A NEW WAY TO BREAK THE SAME RULE. `PlanReport` reads
 * the same `PackageResource`, but through an endpoint that did not eager-load
 * `plans` — and that resource emits `price_from` only when the relation is
 * loaded, silently omitting it otherwise. So the figure diverged again without
 * a second implementation existing anywhere: same rule, same function, null
 * input. Fixed in `ProtocolPresenter`, and pinned by a test that asserts the
 * key is POPULATED rather than present. Calling this function is necessary and
 * not sufficient; check what the payload actually carries.
 *
 * KEEP THAT LIST WHOLE WHEN YOU ADD A CONSUMER — it was written naming three,
 * and shipping the rule to only the surfaces a list happened to name is the
 * exact defect this function exists to have ended (three review blocks, one
 * cause). Enumerate from `CatalogRelationItemResource` / `PackageResource`,
 * not from this comment. `sections/PackageSliderSection` is the one deliberate
 * exclusion (operator-authored labels), and a detail page's own buy box shows
 * the package's own price on purpose.
 *
 * `price_from` wins when present. It is the CHEAPEST WAY IN — the lowest of the
 * item's own price and its monthly-cadence plans — which is why the card says
 * "as low as" rather than naming a price. Both products and packages carry it
 * now (`BuildsCatalogPricing::catalogPriceFrom`), and it is the only figure
 * safe to show alone: `price_range`'s two ends are in different units, and a
 * plan's raw amount can be a multi-month prepay TOTAL.
 *
 * "AS LOW AS" IS A PROMISE ABOUT REACHABILITY, NOT ABOUT WHAT WILL BE CHARGED,
 * and the difference is the whole reason this wording was chosen. On live data
 * the figure usually names a monthly PLAN, so the visitor pays it only by
 * taking on a recurring commitment — which they must actually choose, with the
 * terms in front of them. **A surface showing this figure must therefore not
 * silently add it to the cart.** The remedy is per surface and both are live:
 * the plan report asks in place (`PlanPicker`, a modal opening on
 * `price_from.plan_id`), while the relation rails and the quick view link to
 * the item's own page, because their payload carries the figure without the
 * plans behind it.
 *
 * NOT a fallback to `price_range.from`, which is what RelationCard used to do:
 * that number can be a multi-month prepay TOTAL and arrives with no suffix, so
 * a card led with an unlabelled figure the visitor would read as monthly.
 *
 * `plan_id` says where the figure came from — null means the item's own price,
 * bought once with no rebill. It is not used for formatting: the label is the
 * same either way, because "as low as" is true of a single price too. It is
 * what a plan picker would open on, and what tells a cart whether a rebill is
 * involved.
 *
 * The suffix is whatever the backend sent and is rendered verbatim. For an
 * item's own price that is free text an operator typed and nothing validates
 * it, so do not default it here: a card reading "$399/mo" for a one-time buy
 * is a content bug with a content fix, and a fallback in this function would
 * hide it.
 *
 * Returns null when there is no price at all — never "$0".
 *
 * The "As low as" prefix is hardcoded English, in the same recorded debt class
 * as the card CTA labels — one copy here rather than six is the point, so it
 * moves once when card copy becomes an admin field.
 */
export function catalogCardPrice(item) {
  const from = item?.price_from;

  if (from?.amount != null) {
    return `As low as ${money(from.amount)}${from.suffix || ""}`;
  }

  const price = item?.price;

  return price?.effective != null ? `${money(price.effective)}${price.suffix || ""}` : null;
}

/** "Dr. Jane Q. Smith" → "JS" for no-portrait fallback circles. */
export function initials(name) {
  const parts = (name || "")
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .filter((part, index) => index === 0 || index === parts.length - 1)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/**
 * Can this item go straight into the cart from a card, or must the visitor
 * choose first?
 *
 * THE RULE IS THE FIGURE, NOT THE KIND. A card quotes "as low as $X". When that
 * X is the item's own price the card and the cart agree and a one-tap add is
 * honest. When it came from a PLAN, adding is a mis-sell either way round:
 * passing the plan through signs the visitor up to a rebill they never chose,
 * and adding without it charges more than the card just said. So the card must
 * send them somewhere a term can be picked.
 *
 * Written as a question about the payload rather than `type === "package"`
 * because that is what actually decides it. Stacks are the only items quoting a
 * plan today, so branching on kind looks identical — right up to the day a
 * product gets a monthly plan cheaper than its own price, at which point every
 * product card silently starts overquoting. Backend contract:
 * `prx-backend/docs/frontend/dev.md`, "DO NOT SILENTLY ADD THIS FIGURE".
 */
export function cardQuotesAPlan(item) {
  return item?.price_from?.plan_id != null;
}
