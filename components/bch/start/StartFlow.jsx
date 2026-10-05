"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useQuizFlow from "@/components/quiz/useQuizFlow";
import { resolveOutcomes } from "@/lib/startHereOutcomes";
import ProductCard from "../catalog/ProductCard";

/**
 * Screens of the start-here flow: intro, one step at a time, then the result.
 * Navigation and branching are `useQuizFlow`; this file is markup.
 *
 * A single-choice step moves on as soon as an option is picked (Back is always
 * there); a multi-choice step waits for Continue. Focus moves to each new
 * screen's heading so keyboard and screen-reader users land on the question.
 *
 * Answers stay in this component: nothing is sent or stored, and nothing goes
 * in the URL, because answers about symptoms are health information.
 */
export default function StartFlow({ quiz, products }) {
  const flow = useQuizFlow(quiz);
  const [screen, setScreen] = useState("intro");
  const [result, setResult] = useState(null);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const heading = useRef(null);

  useEffect(() => {
    heading.current?.focus();
  }, [screen, flow.index]);

  const finish = () => {
    setResult(resolveOutcomes(quiz, flow.steps, flow.visibleAnswers()));
    setScreen("result");
  };

  const advance = () => (flow.isLast ? finish() : flow.next());

  // Auto-advance runs a render AFTER the answer lands, so the path, "is this
  // the last step" and the answers it resolves with all include that answer.
  // The pause lets the selected state paint before the screen changes.
  useEffect(() => {
    if (!autoAdvance) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setAutoAdvance(false);
      advance();
    }, 180);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance is rebuilt each render from fresh state
  }, [autoAdvance, flow.answers]);

  if (screen === "intro") {
    const intro = quiz.intro ?? {};

    return (
      <div className="bch-start bch-start--intro">
        <p className="bch-eyebrow">{intro.eyebrow ?? "Start here"}</p>
        <h1 ref={heading} tabIndex={-1} className="bch-display bch-display--xl">
          {intro.heading ?? quiz.name}
        </h1>
        {intro.body ? <p className="bch-lead">{intro.body}</p> : null}
        <button type="button" className="bch-btn bch-btn--primary" onClick={() => setScreen("questions")}>
          {intro.cta_label ?? "Begin"}
          <span className="bch-arrow" aria-hidden="true">→</span>
        </button>
        {intro.note ? <p className="bch-start__note">{intro.note}</p> : null}
      </div>
    );
  }

  if (screen === "result" && result) {
    return (
      <Result
        quiz={quiz}
        result={result}
        products={products}
        headingRef={heading}
        onRestart={() => {
          flow.goTo(0);
          setScreen("questions");
        }}
      />
    );
  }

  const step = flow.current;

  if (!step) {
    return <p className="bch-start__note">This flow has no questions yet.</p>;
  }

  const total = flow.steps.length;
  const singleOnly = step.questions.length === 1 && step.questions[0].kind === "single_select";

  return (
    <div className="bch-start">
      <div className="bch-start__progress">
        <p>
          Question {flow.index + 1} of {total}
        </p>
        <span className="bch-start__bar" aria-hidden="true">
          <span style={{ width: `${((flow.index + 1) / total) * 100}%` }} />
        </span>
      </div>

      <h1 ref={heading} tabIndex={-1} className="bch-display bch-display--lg bch-start__q">
        {step.heading ?? step.questions[0]?.prompt}
      </h1>
      {step.description ? <p className="bch-start__help">{step.description}</p> : null}

      {step.questions.map((question) => (
        <Question
          key={question.slug}
          question={question}
          value={flow.answers[question.slug]}
          hidePrompt={step.questions.length === 1 && (step.heading ?? question.prompt) === question.prompt}
          onChange={(value) => {
            flow.setAnswer(question.slug, value);
            if (singleOnly) {
              setAutoAdvance(true);
            }
          }}
        />
      ))}

      <div className="bch-start__actions">
        {flow.isFirst ? (
          <button type="button" className="bch-link" onClick={() => setScreen("intro")}>
            Back
          </button>
        ) : (
          <button type="button" className="bch-link" onClick={flow.back}>
            Back
          </button>
        )}
        {singleOnly ? null : (
          <button type="button" className="bch-btn bch-btn--primary" disabled={!flow.complete} onClick={advance}>
            {flow.isLast ? "See my next step" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}

function Question({ question, value, onChange, hidePrompt }) {
  const multi = question.kind === "multi_select" || question.kind === "health_goals";

  if (!["single_select", "multi_select", "health_goals", "text"].includes(question.kind)) {
    return null;
  }

  if (question.kind === "text") {
    return (
      <label className="bch-start__text">
        <span className={hidePrompt ? "bch-visually-hidden" : undefined}>{question.prompt}</span>
        <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  const selected = multi ? (Array.isArray(value) ? value : []) : value;

  const toggle = (option) => {
    if (!multi) {
      onChange(option.value);
      return;
    }

    // An exclusive option ("None of these") clears the others, and picking
    // anything else clears it.
    const next = option.is_exclusive
      ? selected.includes(option.value)
        ? []
        : [option.value]
      : selected.includes(option.value)
        ? selected.filter((entry) => entry !== option.value)
        : [
            ...selected.filter((entry) => !question.options.find((o) => o.value === entry)?.is_exclusive),
            option.value,
          ];

    onChange(next);
  };

  return (
    <fieldset className="bch-start__options" data-multi={multi || undefined}>
      <legend className={hidePrompt ? "bch-visually-hidden" : "bch-start__legend"}>{question.prompt}</legend>
      {question.help || multi ? (
        <p className="bch-start__help">{question.help ?? "Choose any that apply."}</p>
      ) : null}

      {(question.options ?? []).map((option) => {
        const checked = multi ? selected.includes(option.value) : selected === option.value;

        return (
          <label key={option.value} className="bch-start__option" data-checked={checked || undefined}>
            <input
              type={multi ? "checkbox" : "radio"}
              name={question.slug}
              checked={checked}
              onChange={() => toggle(option)}
            />
            <span className="bch-start__option-mark" aria-hidden="true" />
            <span className="bch-start__option-text">
              <span className="bch-start__option-label">{option.label}</span>
              {option.description ? <span className="bch-start__option-desc">{option.description}</span> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function Result({ quiz, result, products, headingRef, onRestart }) {
  const outcome = quiz.outcomes?.[result.primary] ?? null;
  const copy = quiz.results ?? {};

  const goals = new Set(result.goals);
  const showProducts = result.primary === "shop" || result.alternatives.includes("shop");
  const picks = showProducts
    ? products.filter((product) => (product.health_goals ?? []).some((goal) => goals.has(goal.slug))).slice(0, 3)
    : [];

  return (
    <div className="bch-start bch-start--result">
      <p className="bch-eyebrow">{copy.eyebrow ?? "Your next step"}</p>
      <h1 ref={headingRef} tabIndex={-1} className="bch-display bch-display--xl">
        {outcome?.title ?? "Here's where to start."}
      </h1>
      {outcome?.body ? <p className="bch-lead">{outcome.body}</p> : null}

      {outcome?.cta_label && outcome?.cta_url ? (
        <Link href={outcome.cta_url} className="bch-btn bch-btn--primary">
          {outcome.cta_label}
          <span className="bch-arrow" aria-hidden="true">→</span>
        </Link>
      ) : null}
      {outcome?.status ? <p className="bch-hero__status">{outcome.status}</p> : null}

      {result.alternatives.length ? (
        <div className="bch-start__alts">
          <p className="bch-eyebrow">{copy.alternatives_heading ?? "Also worth a look"}</p>
          <ul>
            {result.alternatives.map((key) => {
              const alt = quiz.outcomes[key];

              return alt?.cta_url ? (
                <li key={key}>
                  <Link href={alt.cta_url} className="bch-start__alt">
                    <span className="bch-display bch-display--sm">{alt.short_title ?? alt.title}</span>
                    {alt.summary ? <span>{alt.summary}</span> : null}
                    <span className="bch-link">
                      {alt.cta_label}
                      <span className="bch-arrow" aria-hidden="true">→</span>
                    </span>
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      ) : null}

      {picks.length ? (
        <div className="bch-start__picks">
          <p className="bch-eyebrow">{copy.products_heading ?? "You might start with"}</p>
          <ul className="bch-shop__grid bch-shop__grid--grid bch-shop__grid--cols-3">
            {picks.map((product) => (
              <li key={product.slug}>
                <ProductCard item={product} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="bch-start__actions">
        <button type="button" className="bch-link" onClick={onRestart}>
          Change my answers
        </button>
      </div>
      {copy.footnote ? <p className="bch-start__note">{copy.footnote}</p> : null}
    </div>
  );
}
