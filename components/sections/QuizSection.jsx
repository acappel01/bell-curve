import Heading from "@/components/sections/Heading";
import Html from "@/components/Html";
import QuizWizard from "@/components/quiz/QuizWizard";
import { getQuiz } from "@/lib/api";

/**
 * `quiz` blueprint → the intake quiz running inline on the page.
 *
 * Distinct from `quiz-cta`, which is the INGRESS and only links here. This
 * one mounts the wizard, so a landing page can capture without a second hop.
 *
 * Data: eyebrow, heading, heading_level h1|h2, body, goals (list of slugs).
 *
 * **An async server component**, which is the first in `components/sections/`
 * and deliberate. The quiz definition is content — it belongs to the cached,
 * tagged server fetch in `lib/api.js`, not to a client-side call — and
 * `SectionRenderer` is a server component, so awaiting here is the normal
 * RSC path rather than a trick. Repeated `getQuiz()` calls in one render
 * dedupe, so two quiz sections on a page still cost one request.
 *
 * **Unlike almost every other section, this one does not return null on an
 * empty payload.** Its content is the wizard, not the copy above it — the
 * blueprint says so with `hasIntrinsicContent()` and the backend's
 * `has_content` follows. The one thing that DOES make it render nothing is
 * having no quiz configured, because a wizard with no questions is not a quiz.
 */
export default async function QuizSection({ section }) {
  const data = section.data ?? {};
  const quiz = await getQuiz();

  if (!quiz) {
    return null;
  }

  // The section's own `goals` field narrows the health-goals QUESTION, not the
  // quiz. An empty list means "whatever the quiz offers", which is the common
  // case — a goal the operator adds later then appears here with no edit, and
  // one they withdraw from intake disappears, because the backend resolves
  // that question from the goals table every time it serves the quiz.
  const picked = Array.isArray(data.goals) ? data.goals.filter(Boolean) : [];
  const scoped = picked.length ? narrowGoals(quiz, picked) : quiz;

  const headingLevel = data.heading_level === "h1" ? "h1" : "h2";

  return (
    <section className="quiz-section sx-section">
      <div className="quiz-section__inner sx-content">
        {/*
          Every one of these renders nothing when empty — Heading and Html
          both guard internally — so an operator who wrote no copy gets the
          wizard alone, with no stray spacing from an empty wrapper.
        */}
        <Html as="p" inline value={data.eyebrow} className="quiz-section__eyebrow" />

        <Heading
          as={headingLevel}
          className="quiz-section__heading"
          heading={data.heading}
        />

        <Html value={data.body} className="quiz-section__body" />

        <QuizWizard quiz={scoped} />
      </div>
    </section>
  );
}

/**
 * Restrict the health-goals question to the slugs this section names.
 *
 * Done here rather than in the API because it is a PLACEMENT decision — the
 * same quiz on a campaign page offers fewer goals than the same quiz at /quiz —
 * and the served definition should stay one cacheable payload rather than
 * varying per section.
 *
 * A section naming goals that no longer exist would empty the question, so the
 * narrowing is skipped when it would leave nothing: showing every goal is a
 * better failure than showing none.
 */
function narrowGoals(quiz, picked) {
  return {
    ...quiz,
    steps: quiz.steps.map((step) => ({
      ...step,
      questions: step.questions.map((question) => {
        if (question.kind !== "health_goals") {
          return question;
        }

        const options = question.options.filter((option) => picked.includes(option.value));

        return options.length ? { ...question, options } : question;
      }),
    })),
  };
}
