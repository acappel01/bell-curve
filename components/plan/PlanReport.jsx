import Html from "@/components/Html";
import HealthGoalBadges from "@/components/catalog/HealthGoalBadges";
import PlanAddToCart from "@/components/plan/PlanAddToCart";
import PlanPicker from "@/components/plan/PlanPicker";
import { catalogCardPrice, cardQuotesAPlan } from "@/components/sections/support";
import { packageHref, productHref } from "@/lib/routes";
import { toPlainText } from "@/lib/richText";

/**
 * Did anything actually match?
 *
 * EXPORTED BECAUSE TWO PLACES NEED THE SAME ANSWER and they had already
 * diverged: this file gated the intro on it while the page gated its "your plan
 * is ready" eyebrow on `goals.length > 0`. Those are not the same predicate — a
 * visitor who picks one goal and is excluded from all of it has ONE goal and NO
 * plan, so the page announced a ready plan directly above the operator's "we
 * don't have anything we can recommend". That is the live dead-end case, not a
 * hypothetical: the catalogue has no female-eligible ingredients for sexual
 * wellness today.
 *
 * A goal count is a count. Whether there is a plan is an outcome.
 */
export function hasMatchedGoal(goals) {
  return goals.some((entry) => entry.outcome === "matched");
}

/**
 * The matched protocol on `/plan/{uuid}`, driven by `GET /leads/{uuid}/plan`.
 *
 * A SERVER COMPONENT, deliberately. The payload is per-visitor but it is not
 * interactive: nothing here re-fetches, filters or sorts. Only the add-to-cart
 * button is a client leaf.
 *
 * THREE OUTCOMES PER GOAL, AND THEY ARE NOT THE SAME PAGE. The backend names
 * them because the distinction cannot be made here:
 *
 *   matched     we have something for this goal and this person
 *   restricted  we stock this goal, but everything in it is excluded for their
 *               sex or age
 *   unmapped    nobody has built this goal out yet, for anyone
 *
 * Collapsing the last two into "no results" would tell a woman we have nothing
 * for her when the truth is we have not built it, or tell her we have not built
 * it when the truth is she was ruled out. A visitor can legitimately match
 * nothing — the catalogue carries no female-specific ingredients today, so the
 * empty report is a real outcome rather than an error, and it is built as
 * carefully as the populated one.
 *
 * EVERY SENTENCE IS THE OPERATOR'S. The three states' copy arrives in
 * `meta.copy`, authored per quiz in the admin; this file supplies structure and
 * chooses which one to show. Nothing here writes brand voice, and an unauthored
 * field renders nothing rather than acquiring a hardcoded stand-in — `Html`
 * already returns null on an empty value, so the absence needs no guard.
 */
export default function PlanReport({ goals, meta }) {
  const copy = meta?.copy ?? {};
  const hasMatches = hasMatchedGoal(goals);

  // No goals at all: they reached this page without finishing the quiz, or
  // every goal they picked has been withdrawn since. Distinct from "answered
  // and matched nothing", which renders the per-goal states below.
  if (goals.length === 0) {
    return (
      <section className="plan-report">
        <Html value={copy.heading} as="h2" inline className="plan-report__heading" />
        <Html value={copy.empty} className="plan-report__body" />
      </section>
    );
  }

  return (
    <section className="plan-report">
      <Html value={copy.heading} as="h2" inline className="plan-report__heading" />

      {/* Only when something matched. The intro can promise results, so it must
          never appear above a report that has none. */}
      {hasMatches ? <Html value={copy.intro} className="plan-report__body" /> : null}

      {goals.map((entry) => (
        <PlanGoal key={entry.goal.slug} entry={entry} copy={copy} />
      ))}
    </section>
  );
}

function PlanGoal({ entry, copy }) {
  const { goal, products, packages, outcome } = entry;
  const items = [
    ...packages.map((pkg) => ({ kind: "package", item: pkg })),
    ...products.map((product) => ({ kind: "product", item: product })),
  ];

  return (
    <article className="plan-goal">
      <h3 className="plan-goal__title">{goal.name}</h3>

      {outcome === "matched" ? (
        <ul className="plan-goal__grid">
          {items.map(({ kind, item }) => (
            <li key={`${kind}-${item.slug}`}>
              <PlanItemCard kind={kind} item={item} />
            </li>
          ))}
        </ul>
      ) : (
        // `restricted` and `unmapped` each get their own authored sentence.
        // Neither falls back to the other: saying "we're still building this"
        // to someone who was ruled out is a different and worse claim.
        <Html
          value={outcome === "restricted" ? copy.restricted : copy.unmapped}
          className="plan-goal__empty"
        />
      )}
    </article>
  );
}

/**
 * One matched item.
 *
 * PRICE COMES FROM `catalogCardPrice`, the single rule every card on this site
 * leads with — "as low as $X", the cheapest of the item's own price and its
 * monthly plans. Reimplementing that figure here is precisely how the same item
 * came to read two different numbers on two screens.
 *
 * TWO SEPARATE REASONS A CARD MUST NOT ADD IN ONE TAP, and the branch is
 * `isPackage || cardQuotesAPlan(item)` because both are live:
 *
 *   1. **A STACK ALWAYS ASKS FIRST**, by the operator's decision — picking a
 *      term is a real choice and must be made deliberately. This holds even
 *      when the stack's figure is its own price and a one-tap add would be
 *      honest, which is already the case for two live stacks.
 *   2. **ANY card whose figure came from a PLAN asks**, whatever its kind,
 *      because one tap cannot be honest there: passing the plan through books a
 *      rebill the visitor never chose, and adding without it charges more than
 *      the card said.
 *
 * Rule 2 is a question about the payload rather than about `type`, deliberately.
 * No product quotes a plan today, so it currently changes nothing — and it is
 * what stops every product card silently overquoting the day a product gets a
 * monthly plan below its own price. Rule 1 is the operator's; rule 2 is the
 * correctness floor under it.
 *
 * WHERE THE CHOICE IS MADE IS NOW A THIRD QUESTION, AND IT IS ALSO ABOUT THE
 * PAYLOAD. Both rules were served by a link to the item's own page, which is
 * where a funnel loses the person who has just answered ten questions. They are
 * served in place by `PlanPicker` instead — the same terms, in a modal, opening
 * on the plan the card's figure came from. That needs the item's `plans`, and
 * this endpoint carries them for a package but not for a product
 * (`ProductResource` route-gates the key to the product show route). So the
 * modal is offered when the terms are actually THERE, and the link-out survives
 * as the fallback for a plan-quoting item that arrived without them — a shape
 * no live item has today, and the reason this asks about the array rather than
 * trusting the kind to imply it. Pinned backend-side by
 * `LeadPlanEndpointTest::test_a_package_carries_the_plans_the_report_offers_a_term_from`.
 *
 * Products otherwise add in one tap, so several still reach the bag without
 * leaving a finished quiz — the operator's reason this surface adds at all.
 *
 * STILL NOT BUILT: "protocols", where linked packages and products are added as
 * one selection. That is the operator's larger follow-on and a different shape
 * from picking a term for one item.
 */
function PlanItemCard({ kind, item }) {
  const isPackage = kind === "package";
  const href = isPackage ? packageHref(item.slug) : productHref(item.slug);
  const price = catalogCardPrice(item);

  // See the docblock: a stack and any plan-quoting card must have a term chosen
  // before anything is added, and the choice happens here when the terms came
  // down with the report.
  const mustChooseATerm = isPackage || cardQuotesAPlan(item);
  const canChooseHere = mustChooseATerm && item.plans?.length > 0;

  // `short_description` is an inline rich-text field, so it carries markup that
  // must not reach an attribute or a bare render — see lib/richText.
  const description = toPlainText(item.short_description);

  return (
    <div className="plan-card">
      <a className="plan-card__media" href={href} tabIndex={-1} aria-hidden="true">
        {item.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.hero_image_url} alt="" />
        ) : null}
      </a>

      <div className="plan-card__body">
        <h4 className="plan-card__title">
          <a href={href}>{item.name}</a>
        </h4>

        <HealthGoalBadges goals={item.health_goals} className="hg-badges--card" />

        {description ? <p className="plan-card__blurb">{description}</p> : null}

        {price ? <p className="plan-card__price">{price}</p> : null}

        {/* Three outcomes, in the order the docblock argues them: choose the
            term here, choose it on the item's own page when the terms are not
            in this payload, or add straight to the cart because the card's
            figure IS the item's own price. */}
        {canChooseHere ? (
          <PlanPicker type={kind} item={item} href={href} label="Choose a plan" />
        ) : mustChooseATerm ? (
          // The SAME slot and classes PlanAddToCart and PlanPicker render,
          // deliberately: a row mixing a stack and a product must not step
          // between a full-width button and a shrink-to-fit anchor, and reusing
          // the wrapper means no new CSS to keep in sync with it.
          <div className="plan-card__cta">
            <a className="tf-btn btn-fill plan-card__add" href={href}>
              Choose a plan
            </a>
          </div>
        ) : (
          <PlanAddToCart type="product" id={item.id} planId={null} label="Add to cart" />
        )}
      </div>
    </div>
  );
}
