<?php

/**
 * Builds /find-your-protocol — a real, published page carrying the intake
 * quiz, so the operator has a working funnel destination on day one.
 *
 * Run from the backend repo:
 * php artisan tinker /var/www/html/atlas-protocol-web/scripts/atlas-quiz-page-fill.php
 *
 * WHY A CMS PAGE AND NOT JUST /quiz. `/quiz` is an application route: it
 * exists in code, it always works, and nothing in the admin can change it.
 * That makes it a reliable fallback and a poor landing page — an operator
 * cannot retitle it, reposition it, put a band above it, or point an ad at a
 * variant of it. This page is the editable one. Both mount the same wizard,
 * so there is no second implementation to keep in step.
 *
 * The `quiz` section type is FUNCTIONAL: it renders the wizard with or
 * without the copy above it, so an operator can strip every field here and
 * still have a working page. That is why the section declares
 * `hasIntrinsicContent()` — see the blueprint.
 *
 * IDEMPOTENT AND DESTRUCTIVE TO ITS OWN PAGE ONLY. Every run deletes this
 * page's sections and rebuilds them, so the page matches this file and admin
 * edits do not accumulate. It touches no other page. If the operator has
 * customised the copy in the admin, DO NOT re-run it — the point of the page
 * being a CMS page is that they own it after this.
 *
 * REFERENCES NO MEDIA, so unlike the other atlas-*-fill.php scripts it needs
 * no `cms:backfill-section-media` afterwards.
 *
 * The quiz is deliberately NOT indexed — see the noindex flag below and the
 * matching robots directive on the /quiz route. An indexed wizard competes
 * with the pages it exists to route people to, and its useful content is
 * behind an interaction a crawler will not perform.
 */

use App\Enums\PageStatus;
use App\Models\Page;
use App\Services\Cms\SectionRegistry;

$registry = app(SectionRegistry::class);

$page = Page::firstOrCreate(
    ['slug' => 'find-your-protocol'],
    ['title' => 'Find your protocol', 'status' => PageStatus::Published],
);

$page->update([
    'title' => 'Find your protocol',
    'status' => PageStatus::Published,
    'title_banner' => ['enabled' => false],
    'meta_title' => 'Find your protocol',
    'meta_description' => 'Answer a few questions and see which protocol fits.',
    'noindex' => true,
]);

$page->sections()->delete();

$position = 0;

$band = function (string $type, array $data, array $knobs = []) use ($page, $registry, &$position): void {
    $position++;

    $defaults = $registry->resolve($type)?->defaults() ?? [];

    $page->sections()->create([
        'type' => $type,
        'position' => $position,
        'enabled' => true,
        'data' => array_merge($defaults, $data, $knobs),
    ]);
};

// The quiz itself. `goals` is left empty on purpose: empty means "every goal
// marked for the quiz", so a goal the operator adds later appears here with
// no edit to this page. Naming goals explicitly is for a campaign landing
// page built around one concern.
$band('quiz', [
    'eyebrow' => 'Takes about two minutes',
    'heading' => 'Find your <em>protocol</em>',
    'heading_level' => 'h1',
    'body' => '<p>A few questions about you and what you are working on. '
        .'We only show you what is appropriate for you — so some answers change what comes next.</p>',
    'goals' => [],
]);

echo "Built /find-your-protocol with {$position} section(s).".PHP_EOL;
echo 'Sections: '.$page->sections()->pluck('type')->implode(', ').PHP_EOL;
