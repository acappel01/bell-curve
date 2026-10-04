"use client";

import { useId } from "react";
import Slider from "rc-slider";

/**
 * Height and weight, dragged.
 *
 * STORED METRIC, SHOWN IMPERIAL. The value in state and on the wire is
 * centimetres or kilograms; feet/inches and pounds are a rendering of it. BMI
 * is computed from the metric pair, so keeping that canonical means the report
 * never re-derives a number from a rounded display value — and a future metric
 * toggle becomes a display change rather than a data migration.
 *
 * The conversion rounds only at the edges: `cm -> ft/in` and `kg -> lb` are
 * computed fresh from the stored value on every render rather than being kept
 * as separate state, so dragging cannot drift the two out of step.
 *
 * A native range mirrors the slider for assistive tech, as in AgeSlider — the
 * rc-slider handle carries ARIA, but a screen-reader user gets a far better
 * experience from the real control.
 */
export default function MeasurementSlider({ question, value, onChange }) {
  const id = useId();
  const config = question.config ?? {};
  const isHeight = config.measure === "height";

  const min = isHeight ? (config.min_cm ?? 137) : (config.min_kg ?? 40);
  const max = isHeight ? (config.max_cm ?? 213) : (config.max_kg ?? 205);
  const fallback = isHeight ? (config.default_cm ?? 178) : (config.default_kg ?? 84);

  const current = clamp(typeof value === "number" ? value : fallback, min, max);

  return (
    <div className="quiz-measure">
      <output className="quiz-measure__value" htmlFor={id} aria-live="polite">
        {isHeight ? formatHeight(current) : formatWeight(current)}
      </output>

      <div className="quiz-measure__track">
        <Slider
          value={current}
          onChange={(next) => onChange(clamp(next, min, max))}
          min={min}
          max={max}
          step={1}
          ariaLabelForHandle={question.prompt}
        />
      </div>

      <div className="quiz-measure__bounds" aria-hidden="true">
        <span>{isHeight ? formatHeight(min) : formatWeight(min)}</span>
        <span>{isHeight ? formatHeight(max) : formatWeight(max)}</span>
      </div>

      <input
        type="range"
        className="quiz-measure__native"
        id={id}
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        aria-label={question.prompt}
        aria-valuetext={isHeight ? formatHeight(current) : formatWeight(current)}
      />
    </div>
  );
}

function clamp(n, min, max) {
  return Math.min(Math.max(Number.isFinite(n) ? n : min, min), max);
}

/** cm → 5′ 11″. Rounds to the nearest inch, carrying 12″ up to a foot. */
function formatHeight(cm) {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  return `${feet}′ ${inches}″`;
}

/** kg → lb, whole pounds. */
function formatWeight(kg) {
  return `${Math.round(kg * 2.2046226218)} lb`;
}
