"use client";

/**
 * The answer cards for `single_select` and `multi_select`.
 *
 * One component for both, because they differ only in the input type and the
 * exclusivity rule — splitting them would duplicate the card markup, the icon
 * treatment and the focus handling three ways.
 *
 * Real radios and checkboxes under the cards, visually hidden rather than
 * removed: `display: none` takes an input out of the tab order and out of its
 * radio group, which would leave the cards unreachable by keyboard and
 * unannounced by a screen reader. The card is a `<label>`, so a click anywhere
 * on it drives the input.
 *
 * EXCLUSIVITY is handled here rather than in the wizard, because it is a
 * property of the option ("None of these") and the wizard should not have to
 * know which value is special. Picking an exclusive option clears the rest;
 * picking anything else clears the exclusive one. Without both directions a
 * visitor can answer "none of these, and also high blood pressure".
 */
export default function OptionCards({ question, value, onChange }) {
  const multi = question.kind === "multi_select";
  const selected = multi ? (Array.isArray(value) ? value : []) : value;

  const isChecked = (optionValue) =>
    multi ? selected.includes(optionValue) : selected === optionValue;

  function toggle(option) {
    if (!multi) {
      onChange(option.value);
      return;
    }

    if (isChecked(option.value)) {
      onChange(selected.filter((v) => v !== option.value));
      return;
    }

    if (option.is_exclusive) {
      onChange([option.value]);
      return;
    }

    const exclusiveValues = question.options
      .filter((o) => o.is_exclusive)
      .map((o) => o.value);

    onChange([...selected.filter((v) => !exclusiveValues.includes(v)), option.value]);
  }

  return (
    <div className="quiz-options" role={multi ? "group" : "radiogroup"} aria-label={question.prompt}>
      {question.options.map((option) => {
        const id = `${question.slug}-${option.value}`;

        return (
          <div className="quiz-options__item" key={option.value}>
            <input
              type={multi ? "checkbox" : "radio"}
              className="quiz-options__input"
              id={id}
              name={question.slug}
              checked={isChecked(option.value)}
              onChange={() => toggle(option)}
            />
            <label className="quiz-options__card" htmlFor={id}>
              {option.icon ? (
                <span className="quiz-options__icon" aria-hidden="true">
                  <i className={option.icon} />
                </span>
              ) : null}

              <span className="quiz-options__body">
                <span className="quiz-options__label">{option.label}</span>
                {option.description ? (
                  <span className="quiz-options__desc">{option.description}</span>
                ) : null}
              </span>

              {/*
                Computed live from the catalog when the quiz is served, never
                authored — so a card either has a real figure or none at all.
                An absent figure renders nothing rather than a placeholder,
                because "$0" reads as free.

                THE CHEAPEST WAY INTO THE SET this option points at, wearing
                the same "as low as" wording as every card on the site. It was
                a min/max RANGE until the two ends turned out to be in
                different billing units — "$725 – $6,050" put a six-month
                prepay total next to an entry price and invited the visitor to
                read the larger number as a monthly cost.
              */}
              {option.price_from ? (
                <span className="quiz-options__price">
                  {formatPriceFrom(option.price_from)}
                </span>
              ) : null}
            </label>
          </div>
        );
      })}
    </div>
  );
}

/**
 * "As low as $725" — the option's cheapest entry price.
 *
 * Whole dollars on purpose: this is an orientation figure on a quiz step, not
 * a price a visitor is being asked to accept, and cents add noise to a number
 * whose job is to set expectations before anything is chosen.
 *
 * The wording is the same hardcoded English as `catalogCardPrice` and carries
 * the same recorded debt — it moves once, when card copy becomes an admin
 * field, rather than being reinvented per surface.
 */
function formatPriceFrom({ amount, currency }) {
  if (amount === null || amount === undefined) {
    return null;
  }

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);

  return `As low as ${money}`;
}
