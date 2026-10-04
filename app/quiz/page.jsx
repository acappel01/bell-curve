import QuizWizard from "@/components/quiz/QuizWizard";
import { getQuiz } from "@/lib/api";

export const revalidate = 300;

export const metadata = {
  title: "Find your protocol",
  robots: { index: false, follow: true },
};

/**
 * The intake quiz — an APPLICATION route, not a CMS page, like /checkout.
 *
 * The quiz DEFINITION is content: cached, tagged, fetched server-side. Only
 * the answers are per-visitor, and those never come through here — see
 * `lib/quizClient.js`.
 *
 * Renders an empty state rather than crashing when no quiz is configured: a
 * fresh install has none, and this route must not be the thing that 500s on a
 * new deployment.
 */
export default async function QuizPage() {
  const quiz = await getQuiz();

  return (
    <main className="site-main">
      <div className="container">
        <div className="quiz-page">
          <h1 className="quiz-page__title">Find your protocol</h1>

          {quiz ? (
            <QuizWizard quiz={quiz} />
          ) : (
            <p className="quiz-page__empty">
              Our protocol finder is being set up. Please check back shortly.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
