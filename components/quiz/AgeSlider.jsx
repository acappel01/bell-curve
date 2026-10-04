"use client";

import { useId } from "react";
import Slider from "rc-slider";

/**
 * The intake quiz's age question.
 *
 * A slider rather than a date of birth, deliberately and for two reasons. It
 * is a lighter thing to ask before someone has decided to buy, and a birth
 * date is identifying in a way an age is not — the backend keeps `leads.age`
 * and `leads.date_of_birth` as separate columns rather than back-computing a
 * birthday nobody gave us (see the `leads.age` migration).
 *
 * Single-value `rc-slider`, matching the existing usage in
 * `components/catalog/FilterWidgets.jsx` — controlled `value`, `onChange`
 * while dragging, `onChangeComplete` on release. The parent decides whether it
 * cares about the intermediate values.
 *
 * The number is rendered as text beside the track and mirrored into a real
 * `<input type="range">` for assistive tech: rc-slider's handle carries the
 * ARIA attributes, but a visitor using a screen reader on a small screen gets
 * a far better experience from a native range input, and both drive the same
 * state. `min`/`max` default to the 18-100 the backend validates.
 */
export default function AgeSlider({
  value,
  onChange,
  onCommit,
  min = 18,
  max = 100,
  legend = "How old are you?",
  hint = "Some treatments are only appropriate within certain age ranges.",
  embedded = false,
}) {
  const id = useId();
  const current = clamp(value ?? min, min, max);

  // See SexSelect: the walker owns the fieldset and legend, so an embedded
  // control renders only itself.
  const Wrapper = embedded ? "div" : "fieldset";

  return (
    <Wrapper className={embedded ? "quiz-age" : "quiz-field quiz-age"}>
      {embedded ? null : <legend className="quiz-field__legend">{legend}</legend>}
      {!embedded && hint ? <p className="quiz-field__hint">{hint}</p> : null}

      <output className="quiz-age__value" htmlFor={id} aria-live="polite">
        <span className="quiz-age__number">{current}</span>
        <span className="quiz-age__unit">
          {current >= max ? "years or older" : "years old"}
        </span>
      </output>

      <div className="quiz-age__track">
        <Slider
          value={current}
          onChange={(next) => onChange?.(clamp(next, min, max))}
          onChangeComplete={(next) => onCommit?.(clamp(next, min, max))}
          min={min}
          max={max}
          step={1}
          ariaLabelForHandle={legend}
        />
      </div>

      <div className="quiz-age__bounds" aria-hidden="true">
        <span>{min}</span>
        <span>{max}+</span>
      </div>

      {/*
        Native control driving the same state. Visually hidden rather than
        absent so keyboard and screen-reader users get the real thing; the
        rc-slider handle above stays usable for pointer input.
      */}
      <input
        type="range"
        className="visually-hidden-focusable quiz-age__native"
        id={id}
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={(event) => {
          const next = clamp(Number(event.target.value), min, max);
          onChange?.(next);
          onCommit?.(next);
        }}
        aria-label={legend}
      />
    </Wrapper>
  );
}

function clamp(n, min, max) {
  return Math.min(Math.max(Number.isFinite(n) ? n : min, min), max);
}
