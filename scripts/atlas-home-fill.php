<?php

/**
 * Dev-only: fills the seeded Atlas home page with the theme-reference copy.
 * Run from the backend repo after HomePageSeeder and atlas-catalog-fill.php
 * (the package-slider section references the stack packages by slug):
 * php artisan tinker /var/www/html/atlas-protocol-web/scripts/atlas-home-fill.php
 * Images must exist in backend storage/app/public/sections/ (copied from
 * this repo's theme-reference branch: main-hero-image-1a, hero-pen-img,
 * dr-holland, atlas-pen, angel-pen).
 * IMPORTANT: afterwards run `php artisan cms:backfill-section-media` — this
 * script writes legacy path strings, and the admin's image picker wipes any
 * it can't hydrate on the next page save; the backfill converts them to
 * curator media ids first.
 * Content lives in this deployment's DB — intentionally NOT in any seeder.
 */

use App\Models\Catalog\Package;
use App\Models\Cms\FlexibleSectionType;
use App\Models\Page;
use App\Services\Cms\SectionRegistry;

$page = Page::where('slug', 'home')->firstOrFail();

// Admin-defined flexible type for the Comparison section (theme
// common/Comparison.jsx). Defined before the section scaffold below so the
// registry can resolve it. The frontend registers exact markup for this slug;
// any other flexible type falls back to the generic FlexibleSection renderer.
FlexibleSectionType::updateOrCreate(
    ['slug' => 'comparison-table'],
    [
        'name' => 'Comparison table',
        'description' => 'Us-vs-others feature comparison: check/cross rows between our logo column and a competitor column.',
        'icon' => 'heroicon-o-table-cells',
        'enabled' => true,
        'schema' => ['fields' => [
            ['key' => 'heading', 'kind' => 'text', 'label' => 'Heading', 'max' => 255],
            ['key' => 'us_logo', 'kind' => 'svg', 'label' => 'Our column logo (inline SVG)'],
            ['key' => 'others_label', 'kind' => 'text', 'label' => 'Others column label', 'max' => 120],
            ['key' => 'rows', 'kind' => 'repeater', 'label' => 'Comparison rows', 'fields' => [
                ['key' => 'label', 'kind' => 'text', 'label' => 'Feature', 'required' => true],
                ['key' => 'us', 'kind' => 'boolean', 'label' => 'We have it', 'default' => true],
                ['key' => 'others', 'kind' => 'boolean', 'label' => 'Others have it'],
            ]],
            ['key' => 'cta', 'kind' => 'link', 'label' => 'CTA button'],
        ]],
    ],
);

// Atlas home composition (theme-reference order). Sections missing from the
// scaffold are created empty here; positions are set explicitly afterwards
// because Sortable's sort_when_creating ignores them at create time.
$atlasOrder = [
    'hero',
    'category-grid',
    'image-text-split',
    'how-it-works',
    'physicians',
    'package-slider',
    'product-slider',
    'faq',
    'final-cta',
    'comparison-table',
    'testimonials',
];

$registry = app(SectionRegistry::class);

foreach ($atlasOrder as $i => $type) {
    $section = $page->sections()->firstOrCreate(
        ['type' => $type],
        ['enabled' => true, 'data' => $registry->resolve($type)->defaults()],
    );
    $section->update(['position' => $i + 1]);
}

$atlasCategorySlugs = ['anti-aging', 'healing', 'weight-loss', 'longevity', 'muscle-growth', 'sex-drive'];
$categoryIds = App\Models\Catalog\Category::where('is_visible', true)
    ->whereIn('slug', $atlasCategorySlugs)
    ->get()
    ->sortBy(fn ($c) => array_search($c->slug, $atlasCategorySlugs))
    ->pluck('id')
    ->values()
    ->all();

$stackProductIds = App\Models\Catalog\Product::published()
    ->whereIn('slug', ['performance-stack', 'metabolic-stack', 'sleep-stack', 'clarity-stack'])
    ->orderBy('position')
    ->pluck('id')
    ->all();

$stackIds = Package::published()
    ->whereIn('slug', ['performance-stack', 'metabolic-protocol', 'balance-stack', 'clarity-stack'])
    ->orderBy('position')
    ->pluck('id')
    ->all();

if ($stackIds === []) {
    echo "WARNING: no stack packages found — run atlas-catalog-fill.php first\n";
}

$content = [
    'hero' => [
        'slides' => [[
            'image' => 'sections/main-hero-image-1a.png',
            'image_alt' => 'Atlas Protocol hero',
            'heading' => 'The Operating System for Longevity',
            'heading_emphasis' => null,
            'description' => 'Physician-led peptide protocols',
            'cta_label' => 'Start Your Wellness Journey',
            'cta_url' => '#get-started',
            'text_theme' => 'dark',
        ]],
        'highlight_title' => 'Performance Stack',
        'highlight_subtitle' => 'For active women',
        'highlight_quote' => '"Finally a protocol designed around my hormones, not against them." -Jamie, 51',
        'highlight_image' => 'sections/hero-pen-img.png',
    ],
    'image-text-split' => [
        'eyebrow' => 'What are peptides?',
        'heading' => 'Science Behind Peptide Protocols',
        'lead' => "What makes Atlas Protocol different is not the peptides themselves - it's how they're combined, dosed, and sequenced into a protocol that's tailored to your unique biology.",
        'body' => "<p>Peptides are short chains of amino acids, the fundamental building blocks of every biological process in your body. Unlike conventional medications, peptides work with your body's natural signaling systems to trigger targeted outcomes: fat metabolism, muscle repair, hormonal balance, and cellular regeneration.</p>",
        'cta_label' => 'Start Your program',
        'cta_url' => '#get-started',
    ],
    'how-it-works' => [
        'eyebrow' => 'How it works',
        'heading' => 'Three steps to your personalized protocol',
        'cta_label' => 'Start Your program',
        'cta_url' => '#get-started',
        'steps' => [
            [
                'title' => 'Take the health questionnaire',
                'body' => "100% online and confidential. Your intake form is reviewed by Dr. Holland's clinical team before anything is prescribed.",
            ],
            [
                'title' => 'Get your custom protocol',
                'body' => 'Dr. Holland reviews your intake form and approves a personalized peptide stack matched to your biology and goals.',
            ],
            [
                'title' => 'Receive your peptide pens',
                'body' => 'Fast, free delivery from our accredited pharmacies, discreet packaging with your full protocol guide included.',
            ],
        ],
    ],
    'physicians' => [
        'physicians' => [[
            'name' => 'Dr. Holland Chen, MD',
            'title' => 'Stack Designer & Medical Director',
            'specialty' => 'World-Renowned Longevity Physician · Board-Certified · 20+ Years Clinical Experience',
            'image' => 'sections/dr-holland.png',
            'image_alt' => 'Dr. Holland Chen, MD',
            'bio' => "The four stacks below aren't off-the-shelf protocols. Each one was personally designed by Dr. Holland Chen based on decades of clinical research in longevity, metabolic health, and peptide therapy. Every compound selection, every dosage range, and every combination was built around one principle: no two patients are the same, and no two protocols should be either.",
            'badges' => [
                'Board-certified physician',
                'Longevity & metabolic health',
                '20+ years clinical practice',
                '100% of protocols personally reviewed',
            ],
        ]],
    ],
    'category-grid' => [
        'mode' => 'manual',
        'category_ids' => $categoryIds,
    ],
    'product-slider' => [
        'variant' => 'progressbar',
        'card_cta_label' => 'Request Personalized Care',
        'mode' => 'manual',
        'product_ids' => $stackProductIds,
    ],
    'package-slider' => [
        'heading' => 'Doctor-Led Plans Starting at $179.99/Month',
        'subhead' => 'Custom peptide stacks formulated for your body, your goals, and your biology, not a one-size-fits-all solution. Every protocol is personally reviewed and approved by Dr. Holland.',
        'mode' => 'manual',
        'package_ids' => $stackIds,
        // Card wording. These used to be hardcoded in
        // PackageSliderSection.jsx; they are Atlas's words, so they live here
        // with the rest of Atlas's content. {package} names each card.
        'price_intro_label' => 'First month',
        'price_recurring_label' => 'Recurring',
        'cta_label' => 'Start my {package}',
        'cta_url' => '#get-started',
        'range_aria_label' => 'Scroll through peptide stack plans',
    ],
    'faq' => [
        'heading' => 'Learn More About Our Program',
        'description' => 'A physician-led telehealth platform connecting patients with licensed healthcare providers for personalized GLP-1 weight loss programs.',
        'cta_label' => 'More Questions',
        'cta_url' => '#get-started',
        'image' => 'sections/atlas-pen.png',
        'image_alt' => 'Atlas Protocol peptide pen',
        'faqs' => [
            [
                'q' => 'What are GLP-1 Medications?',
                'a' => "GLP-1 medications are prescription drugs that improve blood sugar control and support weight loss. They work by mimicking the glucagon-like peptide-1 hormone, which regulates appetite and insulin response. Common side effects include nausea, vomiting, and diarrhea — typically managed through careful dosage titration under Dr. Holland's guidance.",
            ],
            [
                'q' => 'What are peptide therapies?',
                'a' => "Peptide therapies use short chains of amino acids that work with your body's natural signaling systems to trigger targeted outcomes: fat metabolism, muscle repair, hormonal balance, and cellular regeneration. Every protocol is personally reviewed and approved by Dr. Holland's clinical team.",
            ],
            [
                'q' => 'How do I know which protocol is right for me?',
                'a' => "Start with the health questionnaire. Dr. Holland's clinical team reviews your intake — your goals, history, and biology — and matches you to the protocol that fits. No two patients are the same, and no two protocols should be either.",
            ],
            [
                'q' => 'Do I need a prescription to begin treatment?',
                'a' => 'Yes. Every Atlas Protocol treatment is prescription-only. After your intake is reviewed by a licensed physician, your personalized protocol is prescribed and shipped from our accredited pharmacies.',
            ],
            [
                'q' => 'How soon can I expect to see results?',
                'a' => 'Results vary by protocol and biology. Most patients begin noticing changes within the first weeks, with full protocol effects building over the following months. Your plan includes ongoing clinical check-ins to track progress and adjust dosing.',
            ],
        ],
    ],
    'final-cta' => [
        'eyebrow' => 'The Longevity Platform',
        'heading' => 'Your wellness journey starts here',
        'primary_cta_label' => 'Start my program',
        'primary_cta_url' => '#get-started',
    ],
    'comparison-table' => [
        'heading' => 'Our Peptides Vs. Research-Use-Only',
        'us_logo' => '<svg width="65" height="67" viewBox="0 0 65 67" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M65 66.4187H47.8725L45.2856 61.1419L38.1045 46.5292L31.6223 33.3146L27.281 24.4598L23.8763 17.4992L27.5337 10.0575L31.7115 1.53343C31.9642 1.02229 32.1278 0.526178 32.4846 0L35.3541 5.83306L39.6805 14.6879L43.9921 23.4826L48.2294 32.142L52.6302 41.1321L56.8674 49.7915L61.179 58.5862L65 66.3736V66.4187Z" fill="black"/><path d="M0 66.4184L1.6503 62.9607L5.99163 54.1209L10.2884 45.3262L12.1171 41.5527L29.304 41.5678L23.4908 53.3842L17.068 66.4184H0Z" fill="black"/></svg>',
        'others_label' => 'Others',
        'rows' => [
            ['label' => 'Made in the USA', 'us' => true, 'others' => false],
            ['label' => 'Bloodwork', 'us' => true, 'others' => false],
            ['label' => 'Physician-led', 'us' => true, 'others' => false],
            ['label' => 'Personalized stacks', 'us' => true, 'others' => false],
            ['label' => 'The pens (major differentiator)', 'us' => true, 'others' => false],
            ['label' => 'Licensed pharmacies and laboratories', 'us' => true, 'others' => false],
        ],
        'cta' => ['label' => 'Start your program', 'url' => '#get-started', 'target' => null],
    ],
    'testimonials' => [
        'heading' => 'Client Success Stories',
        'quotes' => [
            [
                'name' => 'Maxin Will',
                'quote' => 'The doctor-patient relationship is built on two-way communication, trust, and respect. Takes the time to build all three of these important aspects of the relationship with his patients and personally I return the same to him.',
            ],
            [
                'name' => 'Cyril K.',
                'quote' => 'While no longer patients, my wife and I both loved the program. He was always friendly, professional and really cared about us. We were heartbroken when we had to leave his care!',
            ],
            [
                'name' => 'Barry S.',
                'quote' => "I have been a patient for over 5 years and would recommend him to anyone. He' easy to communicate with and is very knowledgeable.",
            ],
            [
                'name' => 'Andrew C.',
                'quote' => 'While no longer patients, my wife and I both loved the program. He was always friendly, professional and really cared about us. We were heartbroken when we had to leave his care!',
            ],
            [
                'name' => 'Tom D.',
                'quote' => "I have been a patient for over 5 years and would recommend him to anyone. He' easy to communicate with and is very knowledgeable.",
            ],
        ],
    ],
];

foreach ($content as $type => $data) {
    $section = $page->sections()->where('type', $type)->first();

    if ($section === null) {
        echo "MISSING section type: {$type}\n";

        continue;
    }

    $section->update(['data' => array_merge($section->data ?? [], $data)]);
    echo "filled: {$type}\n";
}

$page->sections()->where('type', 'product-slider')->update(['enabled' => $stackProductIds !== []]);
echo $stackProductIds === [] ? "product-slider disabled (no products — run atlas-catalog-fill.php)\n" : "product-slider enabled\n";
