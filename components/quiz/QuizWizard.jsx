"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AgeSlider from "./AgeSlider";
import ContactStep from "./ContactStep";
import MeasurementSlider from "./MeasurementSlider";
import OptionCards from "./OptionCards";
import SexSelect from "./SexSelect";
import { stepIsComplete, visibleSteps } from "@/lib/quizVisibility";
import { submitQuiz } from "@/lib/quizClient";

/**
 * Walks an admin-authored quiz.
 *
 * Nothing about the questions lives here any more — the steps, their wording,
 * their options and the conditions that branch between them all arrive from
 * `GET /api/v1/quiz`. This component knows only how to render each KIND and
 * how to move between screens, which is what makes "add a question" an admin
 * job rather than a deploy.
 *
 * VISIBILITY IS RECOMPUTED FROM THE ANSWERS ON EVERY RENDER rather than being
 * tracked as its own state. A question that appears because of an earlier
 * answer must also DISAPPEAR when that answer changes, and the only way to be
 * sure of that is to derive the visible set rather than mutate it. It also
 * means the progress bar shrinks and grows honestly as the path changes.
 *
 * Answers are keyed by question slug — the same key the backend files them
 * under and the same one conditions reference. Answers to questions that later
 * become invisible are kept in state (so going back and forth does not lose
 * typing) but stripped before submit, because an answer to a question that was
 * never askable is not an answer.
 *
 * State is local rather than in the URL, which is the opposite of the catalog
 * rule and deliberate: `?sex=female&age=62&flags=liver` is a health inference
 * in a shareable, loggable, history-resident string.
 */
export default function QuizWizard({ quiz }) {
  const router = useRouter();

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const steps = useMemo(() => visibleSteps(quiz?.steps, answers), [quiz, answers]);

  // Sliders SHOW a value before anyone touches them, so that value has to BE
  // the answer. Without this, a visitor lands on the height step, reads
  // "5′ 10″", and finds Continue dead with nothing on screen explaining why —
  // the question is required and unanswered even though it looks answered.
  //
  // Seeded in an effect rather than during render because it writes state, and
  // only for questions currently visible: seeding a branch the visitor has not
  // reached would file answers to questions they were never asked.
  useEffect(() => {
    const defaults = {};

    for (const step of steps) {
      for (const question of step.questions) {
        if (answers[question.slug] !== undefined) {
          continue;
        }

        const seed = defaultFor(question);

        if (seed !== undefined) {
          defaults[question.slug] = seed;
        }
      }
    }

    if (Object.keys(defaults).length > 0) {
      setAnswers((prev) => ({ ...defaults, ...prev }));
    }
  }, [steps, answers]);

  // The path can shorten under us — answering "no" to something may remove the
  // step the visitor is standing on. Clamping rather than resetting keeps them
  // as close to where they were as the new path allows.
  const current = steps[Math.min(index, steps.length - 1)];

  if (!current) {
    return <p className="quiz-wizard__empty">This quiz has no questions yet.</p>;
  }

  const setAnswer = (slug, value) =>
    setAnswers((prev) => ({ ...prev, [slug]: value }));

  const isLast = index >= steps.length - 1;
  const complete = stepIsComplete(current, answers);

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
            <button type="button" className="tf-btn" onClick={() => setIndex(index - 1)}>
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
              onClick={() => setIndex(index + 1)}
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
