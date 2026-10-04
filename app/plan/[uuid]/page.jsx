import { notFound } from "next/navigation";
import PlanReport, { hasMatchedGoal } from "@/components/plan/PlanReport";
import { getLead, getLeadPlan } from "@/lib/api";
import { KB_BASE_PATH } from "@/lib/routes";

// Never prerendered and never cached: this page is about one person, and the
// UUID in the path is a bearer credential rather than a public identifier.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your plan",
  // A page keyed by an opaque credential must not be indexed, and `follow`
  // is off too — a crawler following the links out of it would confirm the
  // URL exists.
  robots: { index: false, follow: false },
};

/**
 * The report the quiz redirects to, and the page the plan email links back to.
 *
 * IT REPORTS WHAT HAPPENED, NEVER WHAT WAS INTENDED. That rule now covers two
 * separate promises. `plan_sent_at` is stamped only after a send actually
 * returns, and `meta.email_pending` additionally consults whether sending is
 * even possible — so the page can offer a future delivery only when one is
 * genuinely queued, rather than on the strength of a consent tick. Claiming a
 * delivery that did not happen, on the page a visitor reads most carefully, is
 * the failure this shape exists to prevent.
 *
 * THE PDF BUTTON IS GONE RATHER THAN DISABLED. It previously rendered disabled
 * under "your report is being prepared", which was true only while the report
 * did not exist: a visitor who was shown nothing needed to be told something
 * was coming. The report is on this page now, so a permanently dead button
 * under a promise nobody is keeping is the same optimistic lie in a new place.
 * It returns when a generator does.
 *
 * Two fetches, not one. The lead is a cheap row read and the plan resolves the
 * catalogue live — they are separate endpoints so the quiz's own submit
 * response does not pay for the second, and they are awaited together here so
 * this page does not serialize them.
 */
export default async function PlanPage({ params }) {
  const { uuid } = await params;
  const [lead, plan] = await Promise.all([
    getLead(uuid),
    // CAUGHT, BECAUSE Promise.all REJECTS WHOLE. `apiFetch` returns null on a
    // 404 but THROWS on any other failure, so without this a 500 or a timeout
    // resolving the catalogue would take the successful lead read down with it
    // and serve a visitor at the end of the funnel a generic error page. The
    // plan is the heavy half of this page and the confirmation is the half that
    // must always render.
    getLeadPlan(uuid).catch((error) => {
      // Swallowed for the visitor, not for us — an endpoint that is failing
      // must not do it silently.
      console.error(`[plan] could not resolve the protocol for ${uuid}:`, error);

      return null;
    }),
  ]);

  if (!lead) {
    notFound();
  }

  const name = lead.first_name || null;

  // The report is additive: if the plan endpoint fails or 404s, the visitor
  // still gets a page confirming their submission rather than a 500. The
  // matched protocol is the valuable half, but it is not the only half.
  const goals = plan?.data ?? [];
  const meta = plan?.meta ?? null;

  // "YOUR PLAN IS READY" above copy saying we have nothing to recommend is a
  // page arguing with itself. The eyebrow is a claim, not a label, so it is
  // suppressed rather than reworded — there is nothing true and generic to put
  // in its place, and inventing a second sentence here would be brand voice in
  // a component. The visitor still gets the operator's own explanation below.
  //
  // GATED ON WHETHER ANYTHING MATCHED, NOT ON THE GOAL COUNT. A visitor who
  // picks one goal and is excluded from all of it has one goal and no plan;
  // counting goals announces a ready plan to exactly the person who has none.
  // Shared with PlanReport so the two cannot answer this differently again.
  const hasPlan = hasMatchedGoal(goals);

  return (
    <main className="site-main">
      <div className="container">
        <div className="quiz-plan quiz-plan--report">
          {hasPlan ? <p className="quiz-plan__eyebrow">Your plan is ready</p> : null}

          <h1 className="quiz-plan__title">
            {name ? `${name}, here's your plan` : "Here's your plan"}
          </h1>

          <EmailStatus
            email={lead.email}
            pending={Boolean(meta?.email_pending)}
            sentAt={lead.quiz?.plan_sent_at ?? null}
          />

          {meta ? <PlanReport goals={goals} meta={meta} /> : null}

          <nav className="quiz-plan__links" aria-label="Keep exploring">
            <a href="/products">Browse all products</a>
            <a href={KB_BASE_PATH}>Peptide library</a>
          </nav>
        </div>
      </div>
    </main>
  );
}

/**
 * One line about the email, true in each of the three states it can be in.
 *
 * Silence is the default, and it covers two different cases on purpose: no
 * consent, where promising a send someone declined would be worse than saying
 * nothing; and consent with sending switched off, where the send is not queued
 * and never will be. The page says nothing about email in both, because the
 * only honest alternative would be to explain an operator's mail configuration
 * to a visitor.
 */
function EmailStatus({ email, pending, sentAt }) {
  if (!email || (!sentAt && !pending)) {
    return null;
  }

  return (
    <p className="quiz-plan__lede">
      {sentAt ? (
        <>
          We&rsquo;ve sent a copy to <strong>{email}</strong>.
        </>
      ) : (
        <>
          We&rsquo;ll send a copy to <strong>{email}</strong> shortly.
        </>
      )}
    </p>
  );
}
