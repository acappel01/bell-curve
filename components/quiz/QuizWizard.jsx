"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AgeSlider from "./AgeSlider";
import ContactStep from "./ContactStep";
import MeasurementSlider from "./MeasurementSlider";
import OptionCards from "./OptionCards";
import SexSelect from "./SexSelect";
import { submitQuiz } from "@/lib/quizClient";
import useQuizFlow from "./useQuizFlow";

/**
 * Walks an admin-authored quiz.
 *
 * Nothing about the questions lives here any more — the steps, their wording,
 * their options and the conditions that branch between them all arrive from
 * `GET /api/v1/quiz`. This component knows only how to render each KIND and
 * how to move between screens, which is what makes "add a question" an admin
 * job rather than a deploy.
 *
 * Visibility, answer keys and stripping unaskable answers are `useQuizFlow`'s
 * rules; see that hook.
 *
 * State is local rather than in the URL, which is the opposite of the catalog
 * rule and deliberate: `?sex=female&age=62&flags=liver` is a health inference
 * in a shareable, loggable, history-resident string.
 */
export default function QuizWizard({ quiz }) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Answers, the visible path and navigation are `useQuizFlow`'s, shared with
  // the Bell Curve start-here flow. This component owns only the markup and
  // what submitting means here (a lead, then the plan page).
  const { answers, steps, current, index, isLast, complete, setAnswer, next, back } = useQuizFlow(quiz, {
    defaultFor,
  });

  if (!current) {
    return <p className="quiz-wizard__empty">This quiz has no questions yet.</p>;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const lead = await submitQuiz({ quiz, steps, answers });
      // Replace, not push: the back button must not return to a filled-in quiz
      // whose answers have already been submitted.
      router.replace(`/plan/${lead.uuid}`);
    } catch (cause) {
      console.error("[quiz] submit failed:", cause);

      if (cause.fieldErrors) {
        setFieldErrors(cause.fieldErrors);
        setError("Please check the highlighted fields.");
      } else {
        setError(
          "We could not save your answers just now. Please try again — if it keeps "
            + "happening, get in touch and we will sort it out.",
        );
      }

      setSubmitting(false);
    }
  }

  return (
    <div className="quiz-wizard">
      {/*
        Nine numbered dots on a phone is a row of circles nobody can read. The
        counter carries the same information in the space available, and the
        dotted list takes over once there is room for its labels. Only one is
        visible at a time, so the count is not announced twice.
      */}
      <p className="quiz-wizard__count" aria-hidden="true">
        Step {index + 1} of {steps.length}
        <span className="quiz-wizard__bar">
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </span>
      </p>

      <ol className="quiz-wizard__progress" aria-label="Progress">
        {steps.map((step, i) => (
          <li
            key={step.slug}
            className="quiz-wizard__step"
            aria-current={i === index ? "step" : undefined}
            data-state={i < index ? "done" : i === index ? "current" : "todo"}
          >
            <span className="quiz-wizard__step-index">{i + 1}</span>
            <span className="quiz-wizard__step-label">{step.name}</span>
          </li>
        ))}
      </ol>

      <section className="quiz-wizard__panel">
        {current.heading ? (
          <h2 className="quiz-field__legend">{current.heading}</h2>
        ) : null}
        {current.description ? (
          <p className="quiz-field__hint">{current.description}</p>
        ) : null}

        {current.questions.map((question) => (
          <Question
            key={question.slug}
            question={question}
            value={answers[question.slug]}
            onChange={(value) => setAnswer(question.slug, value)}
            errors={fieldErrors}
            // A step's own heading already asks the question when it holds
            // only one; repeating it above the control says it twice.
            hidePrompt={current.questions.length === 1 && current.heading === question.prompt}
          />
        ))}

        {error ? (
          <p className="quiz-wizard__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="quiz-wizard__actions">
          {index > 0 ? (
            <button type="button" className="tf-btn" onClick={back}>
              Back
            </button>
          ) : null}

          {isLast ? (
            <button
              type="button"
              className="tf-btn btn-fill"
              onClick={submit}
              disabled={!complete || submitting}
            >
              {submitting ? "Building your plan…" : ctaLabel(current)}
            </button>
          ) : (
            <button
              type="button"
              className="tf-btn btn-fill"
              onClick={next}
              disabled={!complete}
            >
              Continue
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * The value a control displays before it is touched, for the kinds that have
 * one. Everything else returns undefined and stays genuinely unanswered — a
 * select must not answer itself, because a pre-picked option is a choice the
 * visitor did not make.
 */
function defaultFor(question) {
  const config = question.config ?? {};

  switch (question.kind) {
    case "age":
      return config.default ?? config.min ?? 30;
    case "scale":
      return config.default ?? config.min ?? 0;
    case "measurement":
      return config.measure === "height"
        ? (config.default_cm ?? config.min_cm ?? 178)
        : (config.default_kg ?? config.min_kg ?? 84);

    // The consent toggles start where the operator says, and that starting
    // position is REAL state rather than a rendering default — see
    // ContactStep. Email defaults on because it is the delivery mechanism the
    // visitor just asked for; SMS defaults off because it is not.
    case "contact":
      return {
        email_consent: config.email_consent_default ?? true,
        sms_consent: config.sms_consent_default ?? false,
      };
    default:
      return undefined;
  }
}

/** The final button's wording is authored on the contact question. */
function ctaLabel(step) {
  const contact = step.questions.find((q) => q.kind === "contact");
  return contact?.config?.cta_label || "Open my plan";
}

/**
 * One question, dispatched on `kind` — the same one-line contract sections and
 * sub-blocks use. An unknown kind renders nothing rather than crashing: a
 * backend that gains a kind this build does not know about must degrade to a
 * shorter quiz, not a broken page.
 */
function Question({ question, value, onChange, errors, hidePrompt }) {
  const body = renderControl(question, value, onChange, errors);

  if (body === null) {
    return null;
  }

  return (
    <fieldset className="quiz-field">
      {hidePrompt ? null : (
        <legend className="quiz-field__legend">{question.prompt}</legend>
      )}
      {question.help ? <p className="quiz-field__hint">{question.help}</p> : null}
      {body}
    </fieldset>
  );
}

function renderControl(question, value, onChange, errors) {
  switch (question.kind) {
    case "sex":
      return <SexSelect value={value} onChange={onChange} legend={question.prompt} hint={null} embedded />;

    case "age":
      return (
        <AgeSlider
          value={value ?? question.config?.default ?? 30}
          onChange={onChange}
          min={question.config?.min ?? 18}
          max={question.config?.max ?? 100}
          legend={question.prompt}
          hint={null}
          embedded
        />
      );

    case "measurement":
      return <MeasurementSlider question={question} value={value} onChange={onChange} />;

    case "health_goals":
    case "multi_select":
      return (
        <OptionCards
          question={{ ...question, kind: "multi_select" }}
          value={value}
          onChange={onChange}
        />
      );

    case "single_select":
      return <OptionCards question={question} value={value} onChange={onChange} />;

    case "contact":
      return <ContactStep question={question} value={value} onChange={onChange} errors={errors} />;

    case "text":
      return (
        <div className="tf-field style-2 style-3">
          <input
            className="tf-field-input tf-input"
            id={question.slug}
            name={question.slug}
            placeholder=" "
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
          />
          <label className="tf-field-label" htmlFor={question.slug}>
            {question.prompt}
          </label>
        </div>
      );

    default:
      return null;
  }
}
