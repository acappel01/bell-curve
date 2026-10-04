<?php

/**
 * Dev-only: fills the Atlas intake quiz's RESULTS-PAGE copy — the words a
 * visitor reads on /plan/{uuid} after finishing the quiz.
 *
 * Run from the backend repo, after atlas-quiz-fill.php has created the quiz:
 * php artisan tinker /var/www/html/atlas-protocol-web/scripts/atlas-quiz-result-fill.php
 *
 * Content lives in this deployment's DB — intentionally NOT in any seeder. The
 * backend ships these columns empty because it ships to more than one brand;
 * the sentences below are Atlas's, which is why they live in this repo.
 *
 * A STARTING POINT, NOT A DECISION. Every field here is editable in the admin
 * at Quizzes → (the quiz) → Results page, and takes effect immediately — the
 * plan endpoint reads it live. Re-running this script OVERWRITES whatever an
 * operator has since written, so it is a first-fill, not a sync.
 *
 * THE TWO EMPTY STATES ARE DIFFERENT CLAIMS AND MUST STAY THAT WAY.
 *
 *   restricted — we stock this goal, but everything mapped to it is excluded
 *                for this person's sex or age. They were ruled out. Today the
 *                catalogue carries no female-specific ingredients, so this is a
 *                real and reachable outcome, not a theoretical one.
 *   unmapped   — nobody has built this goal out yet, for anyone. Telling this
 *                visitor they were "ruled out" would be false; telling the
 *                restricted visitor "we're still building it" would be equally
 *                false in the other direction.
 *
 * Neither sentence explains WHY someone was excluded. That is deliberate and
 * matches the API's own line: varying an answer to enumerate which substances
 * are sex- or age-gated is not something a public page should teach.
 */

use App\Models\Quiz\Quiz;

$quiz = Quiz::query()->where('is_default', true)->first()
    ?? Quiz::query()->orderBy('id')->first();

if (! $quiz) {
    echo "No quiz found — run atlas-quiz-fill.php first.\n";

    return;
}

$quiz->update([
    // NEUTRAL ON PURPOSE. This heading renders in every state, including the
    // two where nothing is recommended — "Your recommended protocol" above
    // "we're still building this out" is the page contradicting itself.
    'result_heading' => 'Your results',

    // Shown ONLY when at least one goal matched, so it may promise results.
    'result_intro' => '<p>Based on what you told us, here is what our clinicians '
        .'would consider for you. Nothing here is a prescription — a licensed provider '
        .'reviews your intake and decides what is appropriate before anything ships.</p>',

    // They were ruled out for this goal. Say what to do next, not why.
    'result_restricted_body' => '<p>We don&rsquo;t have anything we can recommend for this '
        .'goal based on your answers. That is a clinical judgement, not a stock issue — '
        .'if you think something has been read wrongly, our team can look at it with you.</p>',

    // Nobody has built this goal out yet. Must not imply they were excluded.
    'result_unmapped_body' => '<p>We&rsquo;re still building out our protocols for this goal. '
        .'It isn&rsquo;t available yet — tell us you&rsquo;re interested and we&rsquo;ll let '
        .'you know when it is.</p>',

    // No answers at all: they arrived without finishing, or every goal they
    // picked has since been withdrawn.
    'result_empty_body' => '<p>We don&rsquo;t have enough from you yet to put a plan together. '
        .'Taking the quiz takes about two minutes and tells us what to look at.</p>',
]);

echo "Results copy filled for quiz [{$quiz->slug}].\n";
