"use client";

/**
 * The intake quiz's first question — which eligibility bucket the visitor
 * lands in.
 *
 * Backed by `SexEligibility` on the backend (`any | male | female`), which
 * gates what the recommendation resolver may offer. This control only chooses
 * a bucket; it does NOT decide what the visitor is asked. `options` is a prop
 * with defaults precisely so the labels become admin-authored copy when the
 * funnel-as-data work lands — the buckets are fixed by pharmacology, the
 * wording is the operator's.
 *
 * Real `<input type="radio">` elements under the squares rather than clickable
 * divs: this is the question that decides whether someone is offered
 * testosterone, so it has to be operable by keyboard and legible to a screen
 * reader. The square is `:checked + label` styling over a visually-hidden
 * input, which keeps arrow-key navigation and the native group semantics for
 * free.
 *
 * Colours are custom properties, not literals, so the operator can retune them
 * — see `_quiz-steps.scss` for why they are not palette entries yet.
 */
export default function SexSelect({
  value,
  onChange,
  name = "sex",
  legend = "Which applies to you?",
  hint = "This decides which treatments are appropriate to show you.",
  options = DEFAULT_OPTIONS,
  embedded = false,
}) {
  // `embedded` drops the fieldset and legend because the quiz walker already
  // renders both around every question. Two legends for one control is the
  // kind of duplication a screen reader announces and a sighted user only
  // sees as odd spacing.
  const Wrapper = embedded ? "div" : "fieldset";

  return (
    <Wrapper className={embedded ? "quiz-sex" : "quiz-field quiz-sex"}>
      {embedded ? null : <legend className="quiz-field__legend">{legend}</legend>}
      {!embedded && hint ? <p className="quiz-field__hint">{hint}</p> : null}

      <div className="quiz-sex__options" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;

          return (
            <div className="quiz-sex__option" key={option.value}>
              <input
                type="radio"
                className="quiz-sex__input"
                id={id}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange?.(option.value)}
              />
              <label
                className="quiz-sex__square"
                htmlFor={id}
                data-sex={option.value}
              >
                <i className={option.icon} aria-hidden="true" />
                <span className="quiz-sex__label">{option.label}</span>
              </label>
            </div>
          );
        })}
      </div>
    </Wrapper>
  );
}

/**
 * Defaults, overridable by the caller. The Tabler glyphs ship with the theme
 * webfont (`@tabler/icons-webfont`) — the same font the health-goal icons use,
 * so no new dependency and no inline SVG.
 */
const DEFAULT_OPTIONS = [
  { value: "male", label: "Male", icon: "ti ti-gender-male" },
  { value: "female", label: "Female", icon: "ti ti-gender-female" },
];
