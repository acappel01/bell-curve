import QuizWizard from "@/components/quiz/QuizWizard";
import { templateView } from "@/components/templates";
import { getQuiz } from "@/lib/api";

export const revalidate = 300;

export const metadata = {
  title: "Start here",
  robots: { index: false, follow: true },
};

/**
 * The start-here flow: the admin-authored quiz slugged `start-here`, walked by
 * the template's own view (BCH: questions, then a recommended next step), or
 * by the generic quiz wizard where a template has none.
 */
export default async function StartHerePage() {
  const quiz = await getQuiz("start-here");

  if (!quiz) {
    return (
      <main className="bch-container" style={{ paddingBlock: 64 }}>
        <p>This guide is being set up. Please check back shortly.</p>
      </main>
    );
  }

  const View = await templateView("startHere");

  return <main className="bch-start-page">{View ? <View quiz={quiz} /> : <QuizWizard quiz={quiz} />}</main>;
}
