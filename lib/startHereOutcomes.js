/**
 * Start-here routing: which next step a set of answers points to.
 *
 * THIS IS THE PROPOSED BACKEND RULE, RUN IN THE BROWSER FOR THE PROOF. The
 * backend's recommendation engine today matches goals to products through
 * ingredients and ignores every other answer. Routing a visitor to Care, the
 * Shop, Membership, the Health Map or the library needs answers to carry
 * weight, which is what this models:
 *
 *   option.outcomes = { care: 3, health_map: 1 }   points per outcome
 *   quiz.outcomes   = { care: { title, body, service | cta_label + cta_url }, … }
 *   quiz.outcome_order = ["care", "health_map", …]  tie-break, most important first
 *
 * Scores are summed over the answers on the visible path; the top outcome is
 * the recommendation and the next two with any score are alternatives.
 * Goals picked on a `health_goals` question are returned for product
 * suggestions. All of it is admin data: an operator changes routing by
 * editing weights, not code.
 *
 * Logged as a PRX enhancement (option outcome weights, an outcomes table and
 * `POST /quiz/{slug}/resolve`). When that endpoint exists this file is
 * deleted and the flow posts its answers instead.
 */
export function resolveOutcomes(quiz, steps, answers) {
  const scores = {};
  const goals = [];

  for (const step of steps) {
    for (const question of step.questions) {
      const value = answers[question.slug];
      const picked = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];

      for (const choice of picked) {
        const option = (question.options ?? []).find((entry) => String(entry.value) === String(choice));

        for (const [outcome, points] of Object.entries(option?.outcomes ?? {})) {
          scores[outcome] = (scores[outcome] ?? 0) + Number(points || 0);
        }

        if (question.kind === "health_goals") {
          goals.push(String(choice));
        }
      }
    }
  }

  const order = quiz.outcome_order ?? Object.keys(quiz.outcomes ?? {});
  const ranked = Object.keys(quiz.outcomes ?? {})
    .filter((key) => (scores[key] ?? 0) > 0)
    .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || order.indexOf(a) - order.indexOf(b));

  const fallback = quiz.fallback_outcome && quiz.outcomes?.[quiz.fallback_outcome] ? quiz.fallback_outcome : order[0];
  const primary = ranked[0] ?? fallback ?? null;

  return {
    primary,
    alternatives: ranked.filter((key) => key !== primary).slice(0, 2),
    scores,
    goals,
  };
}
