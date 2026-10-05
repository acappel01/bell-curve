"use client";

import { useEffect, useMemo, useState } from "react";
import { stepIsComplete, visibleSteps } from "@/lib/quizVisibility";

/**
 * Walking an admin-authored quiz, without any markup: answers, the visible
 * path, the current step and moving along it. Shared by the Atlas
 * `QuizWizard` and the Bell Curve start-here flow, so both skins agree on
 * which questions are askable and when a step is complete.
 *
 * VISIBILITY IS RECOMPUTED FROM THE ANSWERS ON EVERY RENDER rather than being
 * tracked as its own state. A question that appears because of an earlier
 * answer must also DISAPPEAR when that answer changes, and the only way to be
 * sure of that is to derive the visible set rather than mutate it.
 *
 * Answers are keyed by question slug — the key the backend files them under
 * and the one conditions reference. Answers to questions that later become
 * invisible stay in state (going back and forth does not lose typing) and the
 * caller's submit strips them, because an answer to a question that was never
 * askable is not an answer.
 *
 * `defaultFor` is the skin's say in what a control shows before it is touched
 * (sliders do, selects must not); whatever it returns is seeded as the answer.
 */
export default function useQuizFlow(quiz, { defaultFor = () => undefined } = {}) {
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);

  const steps = useMemo(() => visibleSteps(quiz?.steps, answers), [quiz, answers]);

  // Seeded in an effect rather than during render because it writes state,
  // and only for questions currently visible: seeding a branch the visitor has
  // not reached would file answers to questions they were never asked.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultFor is a pure mapping
  }, [steps, answers]);

  // The path can shorten under us — answering "no" may remove the step the
  // visitor is standing on. Clamping keeps them as close as the new path allows.
  const position = Math.min(index, Math.max(steps.length - 1, 0));
  const current = steps[position] ?? null;

  /** Answers to the questions on the visible path only — what a submit sends. */
  const visibleAnswers = () => {
    const out = {};
    for (const step of steps) {
      for (const question of step.questions) {
        if (answers[question.slug] !== undefined) {
          out[question.slug] = answers[question.slug];
        }
      }
    }
    return out;
  };

  return {
    answers,
    steps,
    current,
    index: position,
    isFirst: position === 0,
    isLast: position >= steps.length - 1,
    complete: current ? stepIsComplete(current, answers) : false,
    setAnswer: (slug, value) => setAnswers((prev) => ({ ...prev, [slug]: value })),
    next: () => setIndex(position + 1),
    back: () => setIndex(Math.max(position - 1, 0)),
    goTo: (target) => setIndex(Math.max(0, Math.min(target, steps.length - 1))),
    visibleAnswers,
  };
}
