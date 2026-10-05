"use client";

import Link from "next/link";
import { money, planSavingsPercent } from "@/components/sections/support";
import useBuyBox from "@/components/productDetails/useBuyBox";

/**
 * The BCH buy box: one-time purchase and the item's plans as one radio group,
 * a quantity for the one-time buy, and Add to bag.
 *
 * State and the add are `useBuyBox` (shared with the Atlas `AddToCart`), and
 * the saving is `planSavingsPercent` (shared with the Atlas `DealGrid`), so
 * both templates sell the same terms at the same figures. Nothing is
 * preselected but the item itself: a plan is a recurring commitment the
 * visitor has to choose.
 *
 * A prescription item is not added from here at all. It needs a clinician
 * visit first, so the button becomes the Care call to action the service
 * switch currently points at (`careAction`, resolved on the server).
 */
export default function PurchaseOptions({ item, kind, preview = false, careAction = null }) {
  const plans = item.plans ?? [];
  const buyOnce = item.price?.effective ?? null;
  const box = useBuyBox({ item, kind, preview });
  const name = `buy-${item.slug}`;

  if (item.rx_required) {
    return (
      <div className="bch-buy">
        {buyOnce != null ? <p className="bch-buy__price">{money(buyOnce)}{item.price?.suffix || ""}</p> : null}
        <p className="bch-buy__rx">
          Prescription only. A licensed clinician decides whether it is right for you during a telehealth visit.
        </p>
        {careAction ? (
          <Link href={careAction.url} className="bch-btn bch-btn--primary bch-buy__cta">
            {careAction.label}
            <span className="bch-arrow" aria-hidden="true">→</span>
          </Link>
        ) : null}
        {careAction?.status ? <p className="bch-buy__status">{careAction.status}</p> : null}
      </div>
    );
  }

  return (
    <div className="bch-buy">
      <fieldset className="bch-buy__options">
        <legend className="bch-eyebrow">How would you like it?</legend>

        {buyOnce != null ? (
          <label className="bch-buy__option" data-checked={box.planId === null || undefined}>
            <input type="radio" name={name} checked={box.planId === null} onChange={() => box.setPlanId(null)} />
            <span className="bch-buy__option-text">
              <span className="bch-buy__option-name">One-time purchase</span>
              <span className="bch-buy__option-meta">Ships once. No plan.</span>
            </span>
            <span className="bch-buy__option-price">{money(buyOnce)}</span>
          </label>
        ) : null}

        {plans.map((plan) => {
          const saving = planSavingsPercent(plan, buyOnce);
          const months = plan.billing?.term_months;
          const perMonth =
            months > 1 && plan.price?.effective != null ? money(Math.round((plan.price.effective / months) * 100) / 100) : null;

          return (
            <label key={plan.id} className="bch-buy__option" data-checked={box.planId === plan.id || undefined}>
              <input
                type="radio"
                name={name}
                checked={box.planId === plan.id}
                onChange={() => box.setPlanId(plan.id)}
              />
              <span className="bch-buy__option-text">
                <span className="bch-buy__option-name">
                  {plan.name}
                  {saving ? <span className="bch-buy__save">Save {saving}%</span> : null}
                  {!saving && plan.badge_text ? <span className="bch-buy__save">{plan.badge_text}</span> : null}
                </span>
                <span className="bch-buy__option-meta">
                  {plan.short_description || plan.billing?.mode_label || plan.billing?.period_label}
                </span>
              </span>
              <span className="bch-buy__option-price">
                {money(plan.price?.effective)}
                {plan.price?.suffix ? <small>{plan.price.suffix}</small> : null}
                {perMonth ? <small className="bch-buy__per">{perMonth}/mo</small> : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="bch-buy__row">
        {box.showQuantity ? (
          <div className="bch-qty" role="group" aria-label="Quantity">
            <button
              type="button"
              onClick={() => box.setQuantity((q) => Math.max(1, q - 1))}
              disabled={box.quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <output aria-live="polite">{box.quantity}</output>
            <button
              type="button"
              onClick={() => box.setQuantity((q) => Math.min(10, q + 1))}
              disabled={box.quantity >= 10}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="bch-btn bch-btn--primary bch-buy__cta"
          disabled={box.busy || box.outOfStock}
          onClick={box.add}
        >
          {box.outOfStock ? "Out of stock" : box.planId === null ? "Add to bag" : "Start this plan"}
        </button>
      </div>

      {box.error ? (
        <p className="bch-buy__notice" role="alert">
          {box.error}
        </p>
      ) : null}
      {box.notice ? (
        <p className="bch-buy__notice" role="status">
          {box.notice}
        </p>
      ) : null}
    </div>
  );
}
