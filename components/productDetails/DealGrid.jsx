"use client";

import { money } from "@/components/sections/support";

/**
 * The term chooser: a radio group of plans plus the "or buy once" line.
 *
 * PRESENTATIONAL AND CONTROLLED. It owns no state and performs no add — the
 * caller holds `selectedPlanId` and decides what a confirmation does. That is
 * what lets the same grid serve the detail page's buy box and the plan
 * report's picker modal without either learning about the other.
 *
 * EXTRACTED RATHER THAN COPIED, deliberately. This markup is the one place a
 * visitor compares terms, and a second implementation of it is how the same
 * plan comes to read two different prices on two screens — the defect class
 * this project has already paid for twice on the card figure. There is no new
 * CSS: `pd-deal*` and `pd-oneTime*` are width-agnostic and already global, so
 * the grid drops into a modal panel unchanged.
 *
 * `null` MEANS THE ITEM ITSELF, at its own price, and it is a real option
 * rather than the absence of one — a package is a set of products bought once,
 * and plans are the separate recurring commitment alongside it. The buy-once
 * line is part of the same radio group for exactly that reason.
 *
 * The discount is computed against the buy-once price rather than read from a
 * field, because no such field exists: a plan carries a term and a total, and
 * what a visitor wants to know is what the term saves them. It renders only
 * when there is something honest to compare — no buy-once price, no term
 * length, or no saving means no badge, never a "0% off".
 */
export default function DealGrid({
  plans,
  selectedPlanId,
  onSelect,
  buyOncePrice = null,
  label = "Subscribe and Save",
  id,
}) {
  if (!plans?.length) {
    return null;
  }

  const percentOff = (plan) => {
    const months = plan.billing?.term_months;
    const effective = plan.price?.effective;

    if (!buyOncePrice || !months || effective == null) {
      return null;
    }

    const pct = Math.round((1 - effective / (buyOncePrice * months)) * 100);

    return pct > 0 ? pct : null;
  };

  return (
    <div className="pd-dealSection" id={id} role="radiogroup" aria-label={label}>
      <p className="pd-dealLabel">{label}</p>
      <div className="pd-dealGrid">
        {plans.map((plan) => {
          const pct = percentOff(plan);
          const selected = selectedPlanId === plan.id;

          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              className={`pd-dealCard pd-dealCardSelectable${selected ? " pd-popular pd-dealCardPopular" : ""}`}
              key={plan.slug ?? plan.id}
              onClick={() => onSelect(plan.id)}
            >
              {plan.is_default && plan.badge_text ? (
                <span className="pd-popularBadge">{plan.badge_text}</span>
              ) : null}
              <span className="pd-dealMonths">{plan.name}</span>
              {pct != null ? (
                <span className="pd-dealOff">{pct}% off</span>
              ) : plan.price?.intro != null ? (
                <span className="pd-dealOff">First month {money(plan.price.intro)}</span>
              ) : plan.billing?.period_label ? (
                <span className="pd-dealOff">{plan.billing.period_label}</span>
              ) : null}
              {plan.price?.effective != null ? (
                <span className="pd-dealPrice">
                  {money(plan.price.effective)}
                  {plan.price.suffix || ""}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {buyOncePrice != null ? (
        <button
          type="button"
          role="radio"
          aria-checked={selectedPlanId === null}
          className={`pd-oneTime pd-oneTimeSelectable${selectedPlanId === null ? " pd-oneTimeSelected" : ""}`}
          onClick={() => onSelect(null)}
        >
          Or buy once for {money(buyOncePrice)} (no subscription)
        </button>
      ) : null}
    </div>
  );
}
