/**
 * The browser half of `App\Cms\Support\VisibleWhen`.
 *
 * Conditions are authored once in the admin and evaluated TWICE: here, as the
 * visitor answers, so a question appears the moment it becomes relevant; and
 * again on the server at submit, against what they actually sent. The second
 * evaluation is the one that matters — this one is a rendering decision and a
 * caller could skip it, whereas the server's decides whether an answer to a
 * question that was never askable is accepted.
 *
 * Kept deliberately faithful to the PHP rather than "improved": both sides
 * compare as strings because a select value saved as 4 must still match an
 * authored '4', and both treat an unrecognised operator as `equals`. A cleverer
 * comparison here would make the two disagree, and a question that shows in the
 * browser but is rejected at submit is the worst version of that bug.
 */

const asString = (value) =>
  value === null || value === undefined || typeof value === "object" ? "" : String(value);

/** Membership, with a scalar degrading to equality — mirrors VisibleWhen::contains(). */
function contains(actual, expected) {
  const needle = asString(expected);

  if (Array.isArray(actual)) {
    return actual.some((item) => asString(item) === needle);
  }

  return asString(actual) === needle;
}

/**
 * @param {Array<{field: string, operator?: string, value?: unknown}>} conditions
 * @param {(field: string) => unknown} get
 */
export function passesVisibility(conditions, get) {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => {
    if (!condition || typeof condition.field !== "string" || condition.field === "") {
      // A malformed condition is ignored rather than failing closed. The PHP
      // does the same: a half-authored rule must not silently hide a question
      // an operator thinks they are asking.
      return true;
    }

    const actual = get(condition.field);

    switch (condition.operator) {
      case "contains":
        return contains(actual, condition.value);
      case "not_contains":
        return !contains(actual, condition.value);
      case "not_equals":
        return asString(actual) !== asString(condition.value);
      default:
        return asString(actual) === asString(condition.value);
    }
  });
}

/**
 * The steps a visitor should actually see, with their questions filtered.
 *
 * A step whose own conditions fail is dropped whole, and so is one left with no
 * visible questions — hiding questions one at a time would otherwise leave an
 * empty screen with a working Continue button, which reads as a broken quiz.
 */
export function visibleSteps(steps, answers) {
  const get = (field) => answers[field];

  return (steps ?? [])
    .filter((step) => passesVisibility(step.visible_when, get))
    .map((step) => ({
      ...step,
      questions: (step.questions ?? []).filter((q) => passesVisibility(q.visible_when, get)),
    }))
    .filter((step) => step.questions.length > 0);
}

/**
 * Whether every required question on a step has been answered.
 *
 * An empty array counts as unanswered — a multi-select with nothing ticked is
 * not a choice — but `0` and `false` count as answers, because a slider at its
 * minimum is a real value.
 */
export function stepIsComplete(step, answers) {
  return step.questions.every((question) => {
    if (!question.is_required) {
      return true;
    }

    const value = answers[question.slug];

    if (value === undefined || value === null || value === "") {
      return false;
    }

    return !Array.isArray(value) || value.length > 0;
  });
}
