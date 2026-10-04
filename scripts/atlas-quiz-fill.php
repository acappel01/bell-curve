<?php

/**
 * Builds Atlas's intake quiz — steps, questions, options and the branching.
 *
 * Run from the backend repo:
 * php artisan tinker /var/www/html/atlas-protocol-web/scripts/atlas-quiz-fill.php
 *
 * THIS IS CONTENT, not structure. The tables, kinds and condition format are
 * generic prx-backend; the wording below is Atlas's, which is why it lives in
 * this repo as a fill script rather than a backend seeder. Every line of it is
 * editable in the admin afterwards — that is the whole point of the quiz being
 * data — so treat this as the starting position, not the source of truth.
 *
 * IDEMPOTENT AND DESTRUCTIVE TO ITS OWN QUIZ ONLY. Every run deletes the
 * `atlas-intake` quiz's steps and rebuilds them. DO NOT re-run it after an
 * operator has edited the copy in the admin — it will discard their work.
 *
 * Answers are keyed by question slug, and those keys are load-bearing:
 * `visible_when` conditions reference them, and the report's merge tokens will
 * too. Renaming one orphans existing answers. Add a question rather than
 * renaming one that has been live.
 */

use App\Enums\Quiz\QuizQuestionKind;
use App\Models\Quiz\Quiz;

$quiz = Quiz::firstOrCreate(
    ['slug' => 'atlas-intake'],
    ['name' => 'Atlas intake', 'is_active' => true, 'is_default' => true],
);

$quiz->update(['name' => 'Atlas intake', 'is_active' => true, 'is_default' => true]);
$quiz->steps()->delete();

$stepPosition = 0;

$step = function (string $slug, string $name, ?string $heading, ?string $description, array $questions, array $visibleWhen = []) use ($quiz, &$stepPosition): void {
    $stepPosition++;

    $step = $quiz->steps()->create([
        'slug' => $slug,
        'name' => $name,
        'heading' => $heading,
        'description' => $description,
        'position' => $stepPosition,
        'is_active' => true,
        'visible_when' => $visibleWhen ?: null,
    ]);

    $questionPosition = 0;

    foreach ($questions as $q) {
        $questionPosition++;

        $question = $step->questions()->create([
            'slug' => $q['slug'],
            'kind' => $q['kind'],
            'prompt' => $q['prompt'],
            'help' => $q['help'] ?? null,
            'is_required' => $q['required'] ?? true,
            'position' => $questionPosition,
            'is_active' => true,
            'visible_when' => $q['visible_when'] ?? null,
            'config' => $q['config'] ?? null,
        ]);

        $optionPosition = 0;

        foreach ($q['options'] ?? [] as $o) {
            $optionPosition++;

            $question->options()->create([
                'value' => $o['value'],
                'label' => $o['label'],
                'description' => $o['description'] ?? null,
                'icon' => $o['icon'] ?? null,
                'is_exclusive' => $o['exclusive'] ?? false,
                'price_source' => $o['price_source'] ?? null,
                'position' => $optionPosition,
                'is_active' => true,
            ]);
        }
    }
};

// ── 1. Who you are ────────────────────────────────────────────────────────
// Sex and age are RESERVED kinds: they feed the eligibility gate that decides
// which treatments may be recommended at all, so they are not authored options
// an operator could widen by accident. Asked first for that reason — a goal
// resolves differently depending on them, and asking later would mean showing
// someone a protocol and then withdrawing half of it.
$step('about-you', 'About you', 'First, a little about you', 'This decides which treatments are appropriate to show you.', [
    ['slug' => 'sex', 'kind' => QuizQuestionKind::Sex, 'prompt' => 'Which applies to you?'],
    ['slug' => 'age', 'kind' => QuizQuestionKind::Age, 'prompt' => 'How old are you?',
        'help' => 'Some treatments are only appropriate within certain age ranges.',
        'config' => ['min' => 18, 'max' => 100, 'default' => 30]],
]);

// ── 2. Goals ──────────────────────────────────────────────────────────────
$step('goals', 'Your goals', 'What are you working on?', 'Pick as many as apply.', [
    ['slug' => 'health_goals', 'kind' => QuizQuestionKind::HealthGoals, 'prompt' => 'What are you working on?'],
]);

// ── 3. Experience ─────────────────────────────────────────────────────────
$step('experience', 'Experience', 'Tried peptides before?', 'No wrong answer. Most people start from zero.', [
    ['slug' => 'peptide_experience', 'kind' => QuizQuestionKind::SingleSelect, 'prompt' => 'Tried peptides before?', 'options' => [
        ['value' => 'none', 'label' => 'This would be my first time', 'icon' => 'ti ti-seeding'],
        ['value' => 'some', 'label' => "I've dipped a toe in", 'description' => 'One or two', 'icon' => 'ti ti-droplet'],
        ['value' => 'experienced', 'label' => 'I use them already', 'icon' => 'ti ti-flame'],
    ]],
]);

// ── 4. Where you are today ────────────────────────────────────────────────
// Height and weight are asked of EVERYONE, because BMI is on the report's
// cover whatever the goal. The goal-weight question below is the conditional
// one, and it is here as a worked example of the branching an operator can
// author: it appears only when weight management was picked.
$step('today', 'Where you are today', 'Roughly where are you today?', 'Close enough is fine — this is for context, not a medical record.', [
    ['slug' => 'height', 'kind' => QuizQuestionKind::Measurement, 'prompt' => 'Height',
        'config' => ['measure' => 'height', 'unit' => 'imperial', 'min_cm' => 137, 'max_cm' => 213, 'default_cm' => 178]],
    ['slug' => 'weight', 'kind' => QuizQuestionKind::Measurement, 'prompt' => 'Weight',
        'config' => ['measure' => 'weight', 'unit' => 'imperial', 'min_kg' => 40, 'max_kg' => 205, 'default_kg' => 84]],
    ['slug' => 'goal_weight', 'kind' => QuizQuestionKind::Measurement, 'prompt' => 'Where would you like to be?',
        'required' => false,
        'help' => 'Optional. A target helps us pace the plan.',
        'visible_when' => [['field' => 'health_goals', 'operator' => 'contains', 'value' => 'weight-management']],
        'config' => ['measure' => 'weight', 'unit' => 'imperial', 'min_kg' => 40, 'max_kg' => 205, 'default_kg' => 75]],
]);

// ── 5. Anything to flag ───────────────────────────────────────────────────
// "None of these" is EXCLUSIVE: picking it clears the rest, and picking
// anything else clears it. Without that a visitor can answer "none of these,
// and also high blood pressure", which nobody can act on and which would put a
// contradictory line on the report's cover.
$step('flags', 'Anything to flag', 'Anything to flag?', 'This never disqualifies you — it tells the specialist what to look at.', [
    ['slug' => 'flags', 'kind' => QuizQuestionKind::MultiSelect, 'prompt' => 'Anything to flag?', 'required' => false, 'options' => [
        ['value' => 'extra-weight', 'label' => 'Carrying extra weight', 'icon' => 'ti ti-scale'],
        ['value' => 'blood-pressure', 'label' => 'Blood pressure', 'icon' => 'ti ti-heartbeat'],
        ['value' => 'cholesterol', 'label' => 'Cholesterol', 'icon' => 'ti ti-activity-heartbeat'],
        ['value' => 'blood-sugar', 'label' => 'Blood sugar', 'icon' => 'ti ti-droplet-half-2'],
        ['value' => 'liver', 'label' => 'Liver', 'icon' => 'ti ti-flask'],
        ['value' => 'none', 'label' => 'None of these', 'icon' => 'ti ti-ban', 'exclusive' => true],
    ]],
]);

// ── 6. Medications ────────────────────────────────────────────────────────
$step('medications', 'Medications', 'On any medications right now?', 'Including anything prescribed, and anything you take regularly.', [
    ['slug' => 'medications', 'kind' => QuizQuestionKind::SingleSelect, 'prompt' => 'On any medications right now?', 'options' => [
        ['value' => 'no', 'label' => 'No', 'icon' => 'ti ti-pill-off'],
        ['value' => 'not-now', 'label' => 'Not right now', 'icon' => 'ti ti-pill'],
        ['value' => 'yes', 'label' => 'Yes, I take something', 'icon' => 'ti ti-vaccine-bottle'],
    ]],
]);

// ── 7. Daily movement ─────────────────────────────────────────────────────
$step('routine', 'Your routine', 'What does a normal day look like?', null, [
    ['slug' => 'activity_level', 'kind' => QuizQuestionKind::SingleSelect, 'prompt' => 'What does a normal day look like?', 'options' => [
        ['value' => 'desk', 'label' => 'Mostly at a desk', 'icon' => 'ti ti-armchair'],
        ['value' => 'moderate', 'label' => 'Moving a few times a week', 'icon' => 'ti ti-walk'],
        ['value' => 'active', 'label' => 'On my feet most days', 'icon' => 'ti ti-run'],
    ]],
]);

// ── 8. Where to start ─────────────────────────────────────────────────────
// The first three options carry a LIVE price range, computed from published
// plan prices when the quiz is served. `price_source` names where to look; no
// price is authored here, because a number typed next to a buying decision
// goes stale silently. "Let the team advise" carries none on purpose — its
// answer is a conversation, not a basket.
$step('starting-point', 'Where to start', 'Where would you like to start?', 'You can change this later — nothing here is a commitment.', [
    ['slug' => 'starting_point', 'kind' => QuizQuestionKind::SingleSelect, 'prompt' => 'Where would you like to start?', 'options' => [
        ['value' => 'single', 'label' => 'One peptide', 'description' => 'Start simple, add later', 'icon' => 'ti ti-vaccine-bottle', 'price_source' => 'products'],
        ['value' => 'protocol', 'label' => 'Start with a protocol', 'description' => 'A few peptides designed to run together', 'icon' => 'ti ti-capsule', 'price_source' => 'packages:protocol'],
        ['value' => 'stack', 'label' => 'Start with a full stack', 'description' => 'The complete system', 'icon' => 'ti ti-stack-2', 'price_source' => 'packages:stack'],
        ['value' => 'advise', 'label' => 'Let the team advise me', 'description' => "We'll suggest what fits", 'icon' => 'ti ti-users'],
    ]],
]);

// ── 9. Contact ────────────────────────────────────────────────────────────
// A reserved kind: its answer is NOT filed in quiz_answers, it becomes the
// lead. The consent labels and the legal line live in `config` so they are
// operator copy — a legal sentence hardcoded in a component is a sentence
// nobody with authority over it can change.
$step('contact', 'Your plan', 'Where should we send it?', 'Your plan is ready. Tell us where it should go.', [
    ['slug' => 'contact', 'kind' => QuizQuestionKind::Contact, 'prompt' => 'Where should we send it?', 'config' => [
        'name_label' => 'Full name',
        'email_label' => 'Email',
        'phone_label' => 'Phone',
        'phone_required' => false,
        'email_consent_label' => 'Email me my plan and follow-ups about it',
        'sms_consent_label' => 'Text me about my plan',
        'legal' => 'By continuing you agree to receive your report, and follow-up about it, by email or SMS depending on what you chose above.',
        'cta_label' => 'Open my plan',
    ]],
]);

echo 'Built quiz "'.$quiz->slug.'" with '.$quiz->steps()->count().' steps and '
    .$quiz->questions()->count().' questions.'.PHP_EOL;
