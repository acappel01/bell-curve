<?php

/**
 * Local-only by default (ATLAS_FILL_ALLOW=1 explicitly overrides): fills this deployment's catalog with the Atlas stacks from the
 * theme-reference PriceSlider. Run from the backend repo:
 * php artisan tinker /var/www/html/atlas-protocol-web/scripts/atlas-catalog-fill.php
 * Images must exist in backend storage/app/public/sections/ (angel-pen.png is
 * copied from this repo's theme-reference branch public/images/).
 * Content lives in this deployment's DB — intentionally NOT in any seeder.
 * Idempotent: packages/plans are matched by slug and updated in place.
 */

use App\Enums\BillingPeriod;
use App\Enums\CatalogRelationType;
use App\Enums\CatalogStatus;
use App\Enums\RebillStrategy;
use App\Models\Catalog\CatalogRelation;
use App\Models\Catalog\Category;
use App\Models\Catalog\Ingredient;
use App\Models\Catalog\MeasurementUnit;
use App\Models\Catalog\Package;
use App\Models\Catalog\Plan;
use App\Models\Catalog\Product;
use App\Models\Catalog\ProductClass;
use App\Models\Catalog\ProductCoa;
use App\Models\Catalog\ProductType;
use App\Models\Content\FaqCategory;
use App\Models\Content\FaqItem;

if (! app()->environment('local') && getenv('ATLAS_FILL_ALLOW') !== '1') {
    throw new RuntimeException('Catalog demo fill is restricted to local. Set ATLAS_FILL_ALLOW=1 only after reviewing its writes and taking a database snapshot.');
}

$catalogIds = [Product::class => [], Package::class => []];

$stacks = [
    [
        'name' => 'Performance Stack',
        'short_description' => 'Muscle retention, energy optimization, and metabolic efficiency — built for men who push hard and want their body to match.',
    ],
    [
        'name' => 'Metabolic Protocol',
        'short_description' => 'A dual-action GLP-1 + GIP stack targeting weight, blood sugar, and sustained metabolic reset — our most comprehensive program.',
    ],
    [
        'name' => 'Balance Stack',
        'short_description' => 'Hormonal harmony, body composition, and sustained wellness — a protocol designed around the unique physiology of women.',
    ],
    [
        'name' => 'Clarity Stack',
        'short_description' => 'A dual-action GLP-1 + GIP stack targeting weight, blood sugar, and sustained metabolic reset — our most comprehensive program.',
    ],
];

// Sortable's sort_when_creating ignores explicit positions, so position is
// always set with a follow-up update. Trashed rows are restored, not duplicated.
$fillBySlug = function (string $model, string $slug, array $attributes) use (&$catalogIds) {
    return tap($model::withTrashed()->firstOrNew(['slug' => $slug]), function ($row) use ($attributes, &$catalogIds) {
        $row->fill($attributes)->save();
        if ($row->trashed()) {
            $row->restore();
        }
        if (isset($catalogIds[$row::class])) {
            $catalogIds[$row::class][] = $row->id;
        }
    });
};

foreach ($stacks as $i => $stack) {
    $package = $fillBySlug(Package::class, Str::slug($stack['name']), [
        'name' => $stack['name'],
        'short_description' => $stack['short_description'],
        'hero_image_path' => 'sections/angel-pen.png',
        'status' => CatalogStatus::Published,
        'is_featured' => true,
        'is_in_stock' => true,
    ]);
    $package->update(['position' => $i + 1]);

    $fillBySlug(Plan::class, Str::slug($stack['name']).'-monthly', [
        'package_id' => $package->id,
        'name' => 'Monthly',
        'billing_period' => BillingPeriod::Monthly,
        'retail_price' => 279.99,
        'intro_price' => 179.99,
        'status' => CatalogStatus::Published,
        'is_recurring' => true,
        'is_default' => true,
        'rebill_strategy' => RebillStrategy::AutoRenew,
    ]);

    echo "stack: {$package->slug} (#{$package->id})\n";
}

echo Package::published()->count()." published packages total\n";

// Product cards for the home Products slider (theme data/stacks.js entries:
// imgSrc = angel-pen, imgHover = atlas-pen).
$products = [
    [
        'name' => 'Performance Stack',
        'short_description' => 'Muscle retention, energy optimization, and metabolic efficiency',
    ],
    [
        'name' => 'Metabolic Stack',
        'short_description' => 'A dual-action GLP-1 + GIP stack',
    ],
    [
        'name' => 'Sleep Stack',
        'short_description' => 'Hormonal harmony, body composition, and sustained wellness',
    ],
    [
        'name' => 'Clarity Stack',
        'short_description' => 'Mental & Cognitive Enhancement',
    ],
];

foreach ($products as $i => $item) {
    $product = $fillBySlug(Product::class, Str::slug($item['name']), [
        'name' => $item['name'],
        'short_description' => $item['short_description'],
        'hero_image_path' => 'sections/angel-pen.png',
        'gallery' => ['sections/atlas-pen.png'],
        'retail_price' => 199,
        'status' => CatalogStatus::Published,
        'is_featured' => true,
        'is_in_stock' => true,
    ]);
    $product->update(['position' => $i + 1]);

    echo "product: {$product->slug} (#{$product->id})\n";
}

echo Product::published()->count()." published products total\n";

// Wellness program categories for the home Categories2 grid (theme
// homes/home-1/Categories2.jsx; category-pen.png is the theme card asset).
// Category has no soft deletes / status — updateOrCreate + is_visible is enough.
foreach (['Anti-Aging', 'Healing', 'Weight Loss', 'Longevity', 'Muscle Growth', 'Sex Drive'] as $i => $name) {
    $category = Category::updateOrCreate(
        ['slug' => Str::slug($name)],
        [
            'name' => $name,
            'hero_image_path' => 'sections/category-pen.png',
            'is_visible' => true,
        ],
    );
    $category->update(['position' => $i + 1]);

    echo "category: {$category->slug} (#{$category->id})\n";
}

echo Category::where('is_visible', true)->count()." visible categories total\n";

// ---------------------------------------------------------------------------
// Enrich only the products/packages seeded above, never the rest of the catalog:
// everything the detail pages and facets can render:
// multi-image galleries, clinical vocabulary, ingredient potencies, COAs,
// detail sections, catalog relations, package contents, term plans.
// Idempotent: firstOrCreate everywhere; only-if-empty guards preserve
// admin-authored content on re-runs.
// ---------------------------------------------------------------------------

// High-res product shots only — hero-pen-img/category-pen are tiny theme
// thumbnails (<200px) and main-hero-image-1a is a wide banner; all three
// blur or crop badly in the 600px gallery frame. The -alt files are
// mirrored derivatives generated from the originals (PIL FLIP_LEFT_RIGHT).
$galleryPool = [
    'sections/angel-pen.png',
    'sections/atlas-pen.png',
    'sections/angel-pen-alt.png',
    'sections/atlas-pen-alt.png',
];
$galleryFor = fn (int $i) => array_map(
    fn (int $k) => $galleryPool[($i + $k) % count($galleryPool)],
    [0, 1, 2, 3],
);

// Clinical vocabulary — classes/types/ingredients are admin- or sync-managed
// lookup tables, so demo rows belong in this deployment fill, not a seeder.
$classIds = [];
foreach (['GLP-1 Receptor Agonists', 'Peptides', 'Coenzymes', 'Secretagogues'] as $name) {
    $classIds[Str::slug($name)] = ProductClass::firstOrCreate(
        ['slug' => Str::slug($name)],
        ['name' => $name, 'is_active' => true],
    )->id;
}

$typeIds = [];
foreach (['Injectable', 'Lyophilized Vial', 'Oral'] as $name) {
    $typeIds[Str::slug($name)] = ProductType::firstOrCreate(
        ['slug' => Str::slug($name)],
        ['name' => $name, 'is_active' => true],
    )->id;
}

$ingredientIds = [];
foreach ([
    'Semaglutide', 'Tirzepatide', 'BPC-157', 'NAD+', 'Sermorelin',
    'CJC-1295', 'Ipamorelin', 'Cyanocobalamin (B12)', 'Glycine', 'L-Carnitine',
] as $name) {
    $ingredient = Ingredient::firstOrCreate(
        ['slug' => Str::slug($name)],
        ['name' => $name, 'is_active' => true],
    );
    $ingredientIds[$ingredient->slug] = $ingredient->id;
}

$unitIds = MeasurementUnit::pluck('id', 'abbreviation');

// slug => [class, type, ingredients => slug => [concentration, per_volume]]
// Potencies follow the pivot convention: per_volume null = lyophilized/dry.
$clinical = [
    'semaglutide' => ['glp-1-receptor-agonists', 'injectable', [
        'semaglutide' => [2.5, 1.0],
        'cyanocobalamin-b12' => [0.5, 1.0],
    ]],
    'tirzepatide' => ['glp-1-receptor-agonists', 'injectable', [
        'tirzepatide' => [10.0, 1.0],
    ]],
    'bpc-157' => ['peptides', 'lyophilized-vial', [
        'bpc-157' => [5.0, null],
    ]],
    'nad-plus' => ['coenzymes', 'injectable', [
        'nad' => [500.0, 5.0],
    ]],
    'sermorelin' => ['secretagogues', 'lyophilized-vial', [
        'sermorelin' => [9.0, null],
    ]],
    'performance-stack' => ['peptides', 'lyophilized-vial', [
        'cjc-1295' => [5.0, null],
        'ipamorelin' => [5.0, null],
    ]],
    'sleep-stack' => ['peptides', 'lyophilized-vial', [
        'cjc-1295' => [5.0, null],
        'glycine' => [50.0, null],
    ]],
    'clarity-stack' => ['secretagogues', 'lyophilized-vial', [
        'sermorelin' => [3.0, null],
        'glycine' => [25.0, null],
    ]],
    'metabolic-stack' => ['glp-1-receptor-agonists', 'injectable', [
        'semaglutide' => [1.0, 1.0],
        'l-carnitine' => [100.0, 1.0],
    ]],
];

// Figma "Product V1/V2" benefits — the per-product highlights presentation.
$figmaHighlights = [
    'semaglutide' => [
        'Appetite & Craving Control',
        'Enhanced Satiety',
        'Metabolic Health',
        'Cardiovascular Protection',
        'Convenient Routine',
        'Sustainable Progress',
    ],
];

$defaultHighlights = [
    'Physician-supervised protocol',
    'Ongoing provider care & support',
    'U.S. pharmacy network fulfillment',
    'Delivery kit included',
];

$defaultSections = fn (string $name) => [
    [
        'title' => 'How To Use',
        'placement' => 'accordion',
        'content' => '<p>Follow the dosing schedule set by your care team. Your delivery kit includes step-by-step instructions, and your provider is available throughout your protocol for adjustments and questions.</p>',
    ],
    [
        'title' => 'Clinical Overview',
        'placement' => 'tab',
        'content' => "<p>{$name} is prepared through our U.S. pharmacy network and shipped with temperature-controlled packaging where required.</p><ul><li>Physician-reviewed intake before every protocol</li><li>Batch-level certificates of analysis</li><li>Ongoing provider check-ins included</li></ul>",
    ],
    [
        'title' => 'Shipping & Support',
        'placement' => 'tab',
        'content' => '<p>Orders ship within 2–3 business days of provider approval. Support is available 7 days a week through your patient portal.</p>',
    ],
];

$semaglutideSections = [
    [
        'title' => 'How To Use',
        'placement' => 'accordion',
        'content' => '<p>Inject once weekly on the same day each week, at any time of day, with or without meals. Dosage is titrated gradually under your provider\'s guidance to minimize side effects.</p>',
    ],
    [
        'title' => 'Storage & Handling',
        'placement' => 'accordion',
        'content' => '<p>Refrigerate between 36–46°F (2–8°C). Do not freeze. Your pen can be kept at room temperature for up to 28 days once in use.</p>',
    ],
    [
        'title' => 'Clinical Overview',
        'placement' => 'tab',
        'content' => '<p>GLP-1 medications improve blood sugar control and support weight loss by mimicking the glucagon-like peptide-1 hormone, which regulates appetite and insulin response.</p><ul><li>Weekly subcutaneous injection</li><li>Gradual dose titration managed by your provider</li><li>Compounded with B12 to support energy levels</li></ul>',
    ],
    [
        'title' => 'Shipping & Support',
        'placement' => 'tab',
        'content' => '<p>Ships cold-chain within 2–3 business days of provider approval. Unlimited provider messaging is included with every protocol.</p>',
    ],
];

$products = Product::published()->whereKey($catalogIds[Product::class])->orderBy('position')->get()->values();
$packages = Package::published()->whereKey($catalogIds[Package::class])->orderBy('position')->get()->values();
$categories = Category::where('is_visible', true)->orderBy('position')->get()->values();

foreach ($products as $i => $product) {
    $updates = [];

    if (blank($product->hero_image_path)) {
        $updates['hero_image_path'] = $galleryPool[$i % count($galleryPool)];
    }
    if (count($product->gallery ?? []) < 3) {
        $updates['gallery'] = $galleryFor($i);
    }
    if (blank($product->description)) {
        $updates['description'] = '<p>'.($product->short_description ?? $product->name).'</p><p>Every protocol begins with a physician-reviewed intake and includes ongoing provider care, dose adjustments, and support from our licensed U.S. pharmacy network.</p>';
    }
    if (empty($product->highlights) || isset($figmaHighlights[$product->slug])) {
        // Canonical shape is the admin repeater's [{item: "..."}] rows.
        $updates['highlights'] = array_map(
            fn (string $item) => ['item' => $item],
            $figmaHighlights[$product->slug] ?? $defaultHighlights,
        );
    }
    if (empty($product->detail_sections)) {
        $updates['detail_sections'] = $product->slug === 'semaglutide'
            ? $semaglutideSections
            : $defaultSections($product->name);
    }

    if (isset($clinical[$product->slug])) {
        [$classSlug, $typeSlug, $potencies] = $clinical[$product->slug];
        $updates['product_class_id'] ??= $product->product_class_id ?? $classIds[$classSlug];
        $updates['product_type_id'] ??= $product->product_type_id ?? $typeIds[$typeSlug];

        $pivots = [];
        foreach ($potencies as $ingredientSlug => [$concentration, $perVolume]) {
            $pivots[$ingredientIds[$ingredientSlug]] = [
                'concentration' => $concentration,
                'concentration_unit_id' => $unitIds['mg'],
                'per_volume' => $perVolume,
                'per_volume_unit_id' => $perVolume !== null ? $unitIds['ml'] : null,
            ];
        }
        $product->ingredients()->syncWithoutDetaching($pivots);
    }

    if ($product->categories()->count() === 0) {
        $product->categories()->syncWithoutDetaching([
            $categories[$i % $categories->count()]->id,
            $categories[($i + 1) % $categories->count()]->id,
        ]);
    }

    if ($updates !== []) {
        $product->update($updates);
    }

    echo "enriched product: {$product->slug}\n";
}

// Hidden demo COAs. Product photos are never publishable lab evidence.
foreach (['semaglutide', 'tirzepatide', 'bpc-157', 'nad-plus'] as $j => $slug) {
    $product = $products->firstWhere('slug', $slug);
    if (! $product) {
        continue;
    }
    foreach ([1, 2] as $batch) {
        ProductCoa::firstOrCreate(
            ['product_id' => $product->id, 'batch_number' => sprintf('ATL-%s-26%02d', strtoupper(substr($slug, 0, 3)), $batch)],
            [
                'file_path' => 'sections/atlas-pen.png',
                'file_type' => 'image',
                'issued_at' => now()->subMonths($batch * 2)->startOfMonth(),
                'notes' => 'Demo placeholder: product photo, not a lab certificate.',
                'is_visible' => false,
            ],
        );
    }
    echo "coas: {$slug}\n";
}

// Package contents, galleries, copy, categories.
$packageContents = [
    'performance-stack' => ['sermorelin', 'bpc-157', 'nad-plus'],
    'recovery-stack' => ['bpc-157', 'nad-plus'],
    'metabolic-protocol' => ['semaglutide', 'nad-plus'],
    'metabolic-reset' => ['tirzepatide', 'nad-plus'],
    'balance-stack' => ['sermorelin', 'nad-plus'],
    'clarity-stack' => ['sermorelin', 'bpc-157'],
];

foreach ($packages as $i => $package) {
    $updates = [];

    if (blank($package->hero_image_path)) {
        $updates['hero_image_path'] = $galleryPool[$i % count($galleryPool)];
    }
    if (count($package->gallery ?? []) < 3) {
        $updates['gallery'] = $galleryFor($i + 2);
    }
    if (blank($package->description)) {
        $updates['description'] = '<p>'.($package->short_description ?? $package->name).'</p><p>Each stack combines complementary compounds under a single physician-supervised protocol, with one intake, one shipment cadence, and one care team.</p>';
    }
    if (empty($package->detail_sections)) {
        $updates['detail_sections'] = $defaultSections($package->name);
    }
    if ($updates !== []) {
        $package->update($updates);
    }

    $slugs = $packageContents[$package->slug]
        ?? $products->slice(($i * 2) % $products->count(), 3)->pluck('slug')->all();
    $pivots = [];
    foreach (array_values($slugs) as $j => $productSlug) {
        if ($member = $products->firstWhere('slug', $productSlug)) {
            $pivots[$member->id] = ['sort_order' => $j + 1, 'is_included' => true];
        }
    }
    $package->products()->syncWithoutDetaching($pivots);

    if ($package->categories()->count() === 0) {
        $package->categories()->syncWithoutDetaching([
            $categories[($i + 2) % $categories->count()]->id,
            $categories[($i + 3) % $categories->count()]->id,
        ]);
    }

    // Term plans alongside the base Monthly — the Figma deal grid shows
    // 3/6/12-month cards; Monthly stays the default "Most Popular" card.
    $monthly = Plan::where('package_id', $package->id)
        ->where('billing_period', BillingPeriod::Monthly)->first();

    if (! $monthly) {
        $monthly = $fillBySlug(Plan::class, $package->slug.'-monthly', [
            'package_id' => $package->id,
            'name' => 'Monthly',
            'billing_period' => BillingPeriod::Monthly,
            'retail_price' => 279.99,
            'intro_price' => 179.99,
            'status' => CatalogStatus::Published,
            'is_recurring' => true,
            'is_default' => true,
            'rebill_strategy' => RebillStrategy::AutoRenew,
        ]);
    }
    if (blank($monthly->badge_text)) {
        $monthly->update(['badge_text' => 'Most Popular']);
    }

    $monthlyRate = (float) $monthly->retail_price;
    foreach ([
        ['3 Month', BillingPeriod::Quarterly, 3, 0.20],
        ['6 Month', BillingPeriod::SemiAnnual, 6, 0.25],
    ] as [$planName, $period, $months, $discount]) {
        $fillBySlug(Plan::class, $package->slug.'-'.Str::slug($planName), [
            'package_id' => $package->id,
            'name' => $planName,
            'billing_period' => $period,
            'term_months' => $months,
            'retail_price' => round($monthlyRate * $months * (1 - $discount), 2),
            'status' => CatalogStatus::Published,
            'is_recurring' => true,
            'is_default' => false,
            'rebill_strategy' => RebillStrategy::AutoRenew,
        ]);
    }

    echo "enriched package: {$package->slug}\n";
}

// Product term plans — the Figma Product V1 deal grid (3/6/12-month cards,
// % off, 6-month default "Most Popular"). The product's own retail/sale
// price remains the one-time "buy once" option, so no monthly plan here.
foreach ($products as $product) {
    $monthlyRate = (float) ($product->sale_price ?? $product->retail_price);

    if ($monthlyRate <= 0) {
        continue;
    }

    foreach ([
        ['3 Month', BillingPeriod::Quarterly, 3, 0.10, false],
        ['6 Month', BillingPeriod::SemiAnnual, 6, 0.20, true],
        ['12 Month', BillingPeriod::Annual, 12, 0.30, false],
    ] as [$planName, $period, $months, $discount, $isDefault]) {
        // "-term-" namespaces the slug away from same-named package plans
        // (Performance Stack exists as both a product and a package).
        $fillBySlug(Plan::class, $product->slug.'-term-'.Str::slug($planName), [
            'product_id' => $product->id,
            'name' => $planName,
            'billing_period' => $period,
            'term_months' => $months,
            'retail_price' => round($monthlyRate * $months * (1 - $discount), 2),
            // Term totals show bare (Figma V1) — '' suppresses the
            // billing-period suffix fallback in PlanResource.
            'price_suffix' => '',
            'badge_text' => $isDefault ? 'Most Popular' : null,
            'status' => CatalogStatus::Published,
            'is_recurring' => true,
            'is_default' => $isDefault,
            'rebill_strategy' => RebillStrategy::AutoRenew,
        ]);
    }

    echo "term plans: {$product->slug}\n";
}

// Catalog relations — related rails + pairs-with accordions, cross-type.
$link = function ($source, $target, CatalogRelationType $type): void {
    $source->catalogRelations()->firstOrCreate([
        'related_type' => $target->getMorphClass(),
        'related_id' => $target->id,
        'relation_type' => $type,
    ]);
};

$productCount = $products->count();
$packageCount = $packages->count();

foreach ($products as $i => $product) {
    foreach ([1, 2, 3] as $step) {
        $link($product, $products[($i + $step) % $productCount], CatalogRelationType::Related);
    }
    $link($product, $products[($i + 4) % $productCount], CatalogRelationType::PairsWith);
    $link($product, $packages[$i % $packageCount], CatalogRelationType::PairsWith);
}

foreach ($packages as $i => $package) {
    $link($package, $packages[($i + 1) % $packageCount], CatalogRelationType::Related);
    $link($package, $packages[($i + 2) % $packageCount], CatalogRelationType::Related);
    $link($package, $products[$i % $productCount], CatalogRelationType::Related);
    $link($package, $products[($i + 1) % $productCount], CatalogRelationType::PairsWith);
}

echo 'relations: '.CatalogRelation::count()." total\n";

// ---------------------------------------------------------------------------
// Conversion-page demo content — FAQs, reviews, injectable sections.
// Attach-only-when-empty guards keep admin curation intact on re-runs.
// After this script, run `php artisan cms:backfill-section-media` so the
// image path strings below become curator media ids (the admin picker
// wipes unhydratable strings on save).
// ---------------------------------------------------------------------------

$faqCategory = FaqCategory::withTrashed()->firstOrNew(['slug' => 'protocol-basics']);
$faqCategory->fill(['name' => 'Protocol Basics', 'is_visible' => true])->save();
if ($faqCategory->trashed()) {
    $faqCategory->restore();
}

$faqFor = function (string $question, string $answer) use ($faqCategory): FaqItem {
    $faq = FaqItem::withTrashed()->firstOrNew(['question' => $question]);
    $faq->fill([
        'faq_category_id' => $faqCategory->id,
        'answer' => $answer,
        'is_published' => true,
    ])->save();
    if ($faq->trashed()) {
        $faq->restore();
    }

    return $faq;
};

$sharedFaqs = [
    $faqFor('Do I need a prescription?', '<p>Yes — every protocol begins with a physician-reviewed intake. If your provider approves your plan, your prescription is issued and filled through our licensed U.S. pharmacy network. No separate doctor visit is needed.</p>'),
    $faqFor('How quickly will I see results?', '<p>Most patients report initial changes within the first 4–6 weeks, with full protocol benefits building over 3–6 months. Your provider reviews progress at every check-in and adjusts dosing as needed.</p>'),
    $faqFor('How is my medication shipped?', '<p>Orders ship within 2–3 business days of provider approval in discreet, temperature-controlled packaging where required. Tracking is available from your patient portal.</p>'),
    $faqFor('Can I pause or cancel my protocol?', '<p>Yes. You can pause or cancel any active protocol from your patient portal or by messaging your care team — no phone calls, no cancellation fees.</p>'),
];

$semaglutideFaqs = [
    $faqFor('What are the common side effects of GLP-1 therapy?', '<p>Mild nausea, especially during the first weeks of titration, is the most common. Taking your dose consistently and eating smaller meals helps. Your provider manages titration speed to minimize side effects.</p>'),
    $faqFor('Do I need to change my diet while on this protocol?', '<p>No specific diet is required, though protein-forward meals and hydration amplify results. Your care team shares nutrition guidance tuned to your protocol at onboarding.</p>'),
];

foreach ($products->concat($packages) as $record) {
    if ($record->faqs()->count() > 0) {
        continue;
    }

    $set = $record->slug === 'semaglutide'
        ? array_merge($sharedFaqs, $semaglutideFaqs)
        : $sharedFaqs;

    $attach = [];
    foreach (array_values($set) as $i => $faq) {
        $attach[$faq->id] = ['position' => $i + 1];
    }
    $record->faqs()->syncWithoutDetaching($attach);

    echo "faqs: {$record->slug} (".count($attach).")\n";
}

// Reviews — approved, admin-sourced, staggered dates so "newest first" is
// visible. Rating mix intentionally includes a 4 so the average isn't 5.0.
$reviewSets = [
    [
        ['Marcus T.', 5, 'Actually stuck with this one', 'Third program I have tried and the first one where the check-ins kept me on track. Down 18 lbs in 10 weeks and my energy is steady all day.'],
        ['Danielle R.', 5, 'The support team is the difference', 'Provider answered my titration questions within hours. Shipping was fast and the instructions made the first injection painless — literally.'],
        ['J. Alvarez', 4, 'Solid results, slow start', 'First two weeks were an adjustment while the dose ramped, but by week six the appetite control was undeniable. Wish shipping was a day faster.'],
        ['Priya S.', 5, 'Six months in', 'This is the longest I have ever maintained a protocol. Auto-refills and provider check-ins make it effortless to stay consistent.'],
    ],
    [
        ['Kevin M.', 5, 'Exceeded expectations', 'Noticeable difference in recovery and sleep within the first month. The stack approach beats juggling separate orders.'],
        ['Aisha B.', 4, 'Good value as a bundle', 'Having everything arrive together on one schedule is underrated. One compound gave me mild headaches early on; my provider adjusted the plan quickly.'],
        ['Tom W.', 5, 'The check-ins keep you honest', 'Provider follow-ups every month meant my plan actually adapted as my results changed.'],
    ],
];

foreach ($products->concat($packages) as $i => $record) {
    if ($record->reviews()->count() > 0) {
        continue;
    }

    foreach ($reviewSets[$i % count($reviewSets)] as $j => [$author, $rating, $title, $body]) {
        $record->reviews()->create([
            'rating' => $rating,
            'author_name' => $author,
            'title' => $title,
            'body' => $body,
            'is_approved' => false,
            'source' => 'admin',
            'reviewed_at' => now()->subDays(($j + 1) * 9 + $i),
        ]);
    }

    echo "reviews: {$record->slug}\n";
}

// Injectable detail-page sections — one image band + one video on the
// flagship product, one image band on the first package, so the sections[]
// envelope renders reviewable content end to end.
$semaglutide = $products->firstWhere('slug', 'semaglutide');
if ($semaglutide && $semaglutide->sections()->count() === 0) {
    $semaglutide->sections()->create([
        'type' => 'image-text-split',
        'anchor_id' => 'science',
        'enabled' => true,
        'data' => [
            'eyebrow' => 'The Science',
            'heading' => 'How GLP-1 Rewires Hunger Signals',
            'lead' => 'Semaglutide mimics the hormone your gut releases after a full meal — so your brain hears "satisfied" sooner and holds onto it longer.',
            'body' => '<p>By activating GLP-1 receptors, semaglutide slows gastric emptying, steadies blood sugar, and quiets the food-noise loop that derails most diets. Combined with B12 in our compounded formulation, patients report steadier energy through the titration phase.</p>',
            'image' => 'sections/atlas-pen.png',
            'image_alt' => 'Atlas injection pen',
            'cta_label' => null,
            'cta_url' => null,
            'image_right' => true,
            'theme' => 'light',
        ],
    ]);
    $semaglutide->sections()->create([
        'type' => 'video-embed',
        'anchor_id' => 'demo-video',
        'enabled' => true,
        'data' => [
            'heading' => 'Your First Injection, Step by Step',
            'caption' => 'A 90-second walkthrough of the weekly routine — most patients say it is easier than they expected.',
            'video_url' => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
            'poster_image' => 'sections/angel-pen.png',
            'theme' => 'light',
        ],
    ]);
    echo "sections: semaglutide (2)\n";
}

// Figma conversion blueprints — one demo instance each on the flagship
// product so highlight-banner / benefits-diagram / image-callout-banner
// render reviewable content. Keyed by type (not count) so they slot in
// beside the bands above on re-runs.
if ($semaglutide) {
    $semaglutide->sections()->firstOrCreate(
        ['type' => 'highlight-banner'],
        [
            'anchor_id' => 'trust-band',
            'enabled' => true,
            'data' => [
                'items' => [
                    ['icon' => null, 'text' => "Designed by\nLeading Physicians"],
                    ['icon' => null, 'text' => "Licensed\nPrescribers"],
                    ['icon' => null, 'text' => "U.S. Pharmacy\nNetwork"],
                    ['icon' => null, 'text' => "HIPAA Compliant\n& Secure"],
                ],
                'icon_placement' => 'left',
                'per_row' => '4',
                'bordered' => false,
                'theme' => 'cream',
            ],
        ],
    );

    $semaglutide->sections()->firstOrCreate(
        ['type' => 'benefits-diagram'],
        [
            'anchor_id' => 'benefits',
            'enabled' => true,
            'data' => [
                'heading' => 'Semaglutide Benefits',
                'image' => 'sections/atlas-pen.png',
                'image_alt' => 'Atlas injection pen',
                'marker_style' => 'dot',
                'points' => [
                    ['text' => 'Appetite & Craving Control', 'side' => 'left', 'icon' => null],
                    ['text' => 'Enhanced Satiety', 'side' => 'left', 'icon' => null],
                    ['text' => 'Convenient Routine', 'side' => 'left', 'icon' => null],
                    ['text' => 'Metabolic Health', 'side' => 'right', 'icon' => null],
                    ['text' => 'Cardiovascular Protection', 'side' => 'right', 'icon' => null],
                    ['text' => 'Sustainable Progress', 'side' => 'right', 'icon' => null],
                ],
                'rating_value' => null,
                'rating_text' => null,
                'cta_label' => 'Start Your Wellness Journey',
                'cta_mode' => 'add_to_cart',
                'cta_url' => null,
                'cta_item_type' => 'product',
                'cta_product_id' => $semaglutide->id,
                'cta_package_id' => null,
                'cta_subtext' => 'Secure checkout guaranteed',
            ],
        ],
    );

    $semaglutide->sections()->firstOrCreate(
        ['type' => 'image-callout-banner'],
        [
            'anchor_id' => 'protocol-callout',
            'enabled' => true,
            'data' => [
                'background_image' => 'sections/main-hero-image-1a.png',
                'background_alt' => 'Atlas protocol lifestyle',
                'callouts' => [
                    [
                        'position' => '0',
                        'color' => null,
                        'icon' => null,
                        'title' => 'A Blueprint for Lasting Wellness',
                        'content' => 'The Atlas Protocol pairs the clinical power of Semaglutide with a structured, supportive program. By quieting constant food noise and resetting natural satiety signals, it removes the exhausting uphill battle of traditional dieting.',
                        'cta_label' => 'Start Your Wellness Journey',
                        'cta_mode' => 'add_to_cart',
                        'cta_url' => null,
                        'cta_item_type' => 'product',
                        'cta_product_id' => $semaglutide->id,
                        'cta_package_id' => null,
                    ],
                ],
            ],
        ],
    );

    echo "figma sections: semaglutide (3)\n";

    // Flagship demo of the V-Conversion template + rails selection.
    if (empty($semaglutide->detail_layout)) {
        $semaglutide->update([
            'detail_layout' => [
                'template' => 'conversion',
                'rails' => ['related', 'stacks'],
            ],
        ]);
        echo "detail_layout: semaglutide -> conversion\n";
    }
}

$firstPackage = $packages->first();
if ($firstPackage && $firstPackage->sections()->count() === 0) {
    $firstPackage->sections()->create([
        'type' => 'image-text-split',
        'anchor_id' => 'why-stack',
        'enabled' => true,
        'data' => [
            'eyebrow' => 'Why a Stack',
            'heading' => 'Compounds That Work Better Together',
            'lead' => 'Each stack pairs complementary compounds under one physician-supervised plan — one intake, one shipment, one care team.',
            'body' => '<p>Stacking eliminates the guesswork of sequencing individual compounds. Your provider calibrates every element of the protocol around your labs and goals, then adjusts as your results come in.</p>',
            'image' => 'sections/angel-pen-alt.png',
            'image_alt' => 'Atlas protocol stack',
            'cta_label' => null,
            'cta_url' => null,
            'image_right' => false,
            'theme' => 'light',
        ],
    ]);
    echo "sections: {$firstPackage->slug} (1)\n";
}

echo "Enrichment complete.\n";
