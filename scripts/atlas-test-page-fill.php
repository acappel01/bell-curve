<?php

/**
 * Dev-only: builds /test-page, a component and layout test bench.
 *
 * Run from the backend repo:
 * php artisan tinker /var/www/html/atlas-protocol-web/scripts/atlas-test-page-fill.php
 *
 * WHAT THIS IS FOR. The layout knobs are the hard thing to eyeball, because
 * each one is a token whose meaning lives in _layout-tokens.scss and whose
 * effect only shows up next to a different value of the same knob. So the bench
 * is built as SCALES: every value of a knob, one after another, same copy in
 * each band, so a broken token reads as a step out of line rather than as a
 * page that looks vaguely fine. Group F then pins the specific regressions this
 * project has actually shipped.
 *
 * THE GROUPS, and what each is for:
 *   A  content_width      — measure at >=1900px or the top three tokens collapse
 *   B  content_inset      — including `flush`, the one token that SUBTRACTS
 *   C  content_align
 *   D  vertical padding   — TWO-AXIS, because the point of splitting top from
 *                           bottom is the asymmetric pairs a single token could
 *                           not express
 *   D2 media_width        — added after an audit found `full` set on zero rows
 *                           sitewide despite the knob having broken once
 *   E  style knobs        — colours resolved by palette NAME
 *   F  regressions        — each one a bug this project actually shipped
 *   G  per-breakpoint     — THE ONLY GROUP THAT NEEDS THE WINDOW RESIZED
 *   H  border and radius  — a rounded band is a CARD and must not reach the
 *                           screen edge; a bordered square one must
 *
 * Group G cannot be read from a screenshot at one width. Resize through 768 and
 * 992, or the four bands look like four ordinary bands.
 *
 * IDEMPOTENT AND DESTRUCTIVE TO ITS OWN PAGE ONLY. Every run deletes the test
 * page's sections and rebuilds them, so the bench matches this file and edits
 * made in the admin do not accumulate. It touches no other page.
 *
 * `noindex` is set: this is a real page on a real site, and hard rule 5 is that
 * the app respects it.
 *
 * Content lives in this deployment's DB — intentionally NOT in any seeder.
 * STILL NO BACKFILL NEEDED, though one band does now reference media: it stores
 * a curator ID, which is what the admin's own picker stores, and MediaResolver
 * turns into {id, url, alt, width, height} at serve time.
 * `cms:backfill-section-media` exists for the legacy PATH STRINGS the other
 * atlas-*-fill.php scripts write, and this script writes none.
 */

use Illuminate\Support\Facades\DB;
use App\Enums\PageStatus;
use App\Models\Page;
use App\Services\Cms\SectionRegistry;

$registry = app(SectionRegistry::class);

$page = Page::firstOrCreate(
    ['slug' => 'test-page'],
    ['title' => 'Component test bench', 'status' => PageStatus::Published],
);

$page->update([
    'title' => 'Component test bench',
    'status' => PageStatus::Published,
    'title_banner' => ['enabled' => false],
    'meta_title' => 'Component test bench',
    'meta_description' => 'Internal layout and component bench. Not for visitors.',
    'noindex' => true,
]);

$page->sections()->delete();

$position = 0;

/**
 * One band on the bench.
 *
 * $knobs are merged over the blueprint's own defaults, so a band sets only the
 * knob it is demonstrating and everything else stays at the per-type default
 * the backend would serve anyway.
 */
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

/** A labelled text band: the label is what you read in the browser to know which knob you are looking at. */
$text = function (string $label, string $note, array $knobs = []) use ($band): void {
    $band('text-block', [
        'eyebrow' => $label,
        'heading' => 'The quick brown fox jumps over the lazy dog',
        'body' => "<p>{$note}</p><p>Same copy in every band of this group, so the only thing that changes between them is the knob named above. A band that does not step in line with its neighbours is the bug.</p>",
    ], $knobs);
};

// Media is resolved by NAME rather than id, so the bench survives a database
// where ids differ. Used by the background-image band in group E and by the
// hero fixture much further down.
//
// HOISTED TO THE TOP, and it had to be: it used to be declared between those
// two consumers, so the FIRST one read an undefined variable, array_filter()
// dropped the null, and the band that exists to prove a background image
// survives a section root painting over it had quietly been rendering with no
// image at all. A dead test that looked like a passing one — `php artisan
// tinker` printed the warning on every run and nothing was reading it.
$bgImage = DB::table('curator')->where('name', 'main-hero-image-1a')->value('id');

// The quiz-cta side image (band I1b). Hoisted for the same reason as $bgImage
// above — a consumer declared before its variable reads null, array_filter()
// drops the key, and the band renders as the single-column variant while
// looking like it passed.
$reportCover = DB::table('curator')->where('name', 'hero-pen-img')->value('id');

// ── A. content_width ──────────────────────────────────────────────────────
// The token → px scale lives in abstracts/_layout-tokens.scss:
// narrow 960 / medium 1216 / wide 1440 / xwide 1760 / full uncapped.
// Read these five as a staircase; two that measure the same means a token is
// not landing.
//
// MEASURE THIS GROUP AT >=1900px. Every token above the viewport width clamps
// to the frame gutter, so on a 1440 screen the top three collapse onto one
// number and look broken when they are not. The old scale had wide at 1394
// and xwide at 1440 — 23px a side — which no one could tell apart on a large
// monitor; that is what prompted the retune.
foreach (['narrow', 'medium', 'wide', 'xwide', 'full'] as $token) {
    $text(
        "content_width: {$token}",
        'Measures the content column only. The band itself stays full-bleed — if the background steps in with the text, the width knob has leaked onto the wrapper.',
        ['content_width' => $token, 'content_inset' => 'md']
    );
}

// ── B. content_inset ──────────────────────────────────────────────────────
// Inset acts on .sx-content, never on the wrapper, so backgrounds stay
// full-bleed while text moves. Pinned at content_width: full so the inset is
// the only thing holding the text off the edge.
foreach (['flush', 'none', 'sm', 'md', 'lg', 'xl'] as $token) {
    $text(
        "content_inset: {$token}",
        $token === 'flush'
            ? 'FLUSH IS THE ONLY TOKEN THAT SUBTRACTS. The others add padding on top of the page gutter; this one cancels the gutter, so this text should touch both screen edges with nothing between it and the glass. Every other band on this page, including "none" directly below, sits a gutter in — 16px at 390, up to 64px on a wide desktop. If this band lines up with that one, the counter-bleed is not firing.'
            : 'Width is set to full here, so the gap you see at each side IS this knob. At 390px these should stay comfortable — the mobile breakpoint is where an inset scale usually falls apart.',
        ['content_inset' => $token, 'content_width' => 'full']
    );
}

// ── C. content_align ──────────────────────────────────────────────────────
foreach (['left', 'center', 'right'] as $token) {
    $text(
        "content_align: {$token}",
        'Aligns text and grid/flex items. A section with a nested grid reads --sx-items in its own partial rather than being listed in the frame file.',
        ['content_align' => $token, 'content_width' => 'medium']
    );
}

// ── D. Vertical padding, TWO AXES ─────────────────────────────────────────
// This group replaced a single `extra_padding` scale when the knob was split
// into style_padding_top and style_padding_bottom. It is two-axis on purpose:
// the whole reason for the split is that one token could not say "generous
// above, tight below", so a bench that only walked a size scale would not
// exercise the thing that changed. The asymmetric pairs are the test.
//
// ALTERNATING COLOURS, not decoration. The padding knob paints its band on the
// wrapper, so adjacent bands sharing one colour merge into a single block and
// the step between them becomes invisible — which is the exact thing this group
// exists to show. Alternating makes each band's edges readable.
//
// READ THE TOP AND BOTTOM GAPS SEPARATELY. A band whose two gaps always match
// means the longhands have collapsed back into a shorthand somewhere.
$padPairs = [
    ['lg', 'none', 'sand', 'All the room above, none below. If the bottom gap is not zero, the two knobs are not independent.'],
    ['none', 'lg', 'shell', 'The mirror of the band above. These two together are the case the retired single-token knob could not express at all.'],
    ['sm', 'lg', 'sand', 'Asymmetric both ways: a tight top and a generous bottom.'],
    ['lg', 'lg', 'shell', 'Both large — this is the only shape the old extra_padding could make.'],
];

foreach ($padPairs as [$top, $bottom, $colour, $note]) {
    $text(
        "padding top: {$top} / bottom: {$bottom}",
        $note.' Padding lands on the wrapper, which is the element carrying the background, so it grows the coloured band itself rather than just the gap around the words.',
        [
            'style_padding_top' => $top,
            'style_padding_bottom' => $bottom,
            'style_background_color' => $colour,
            'content_width' => 'medium',
        ]
    );
}

// ── D2. media_width — THE KNOB WITH NO COVERAGE ───────────────────────────
// Added because an audit found `media_width: full` set on ZERO rows sitewide,
// this bench included, despite the knob having already broken once (the hero,
// via a same-specificity rule in _responsive.scss that loads after the frame).
// It had to be tested by injecting the class into a headless page, which is not
// a regression test — nothing re-runs it.
//
// image-text-split is the carrier because it marks its image `.sx-media`, which
// is what the knob acts on. A section that marks nothing is inert by design.
foreach (['contained', 'full'] as $token) {
    $band('image-text-split', [
        'eyebrow' => "media_width: {$token}",
        'heading' => 'The quick brown fox jumps over the lazy dog',
        'body' => '<p>Contained keeps the image inside the content column; full escapes BOTH the column and the page gutter, so it should touch the screen edges. The escape is `calc(50% - 50vw)` rather than a negative gutter, because the content column may be capped narrower than the page — backing out by the gutter alone would stop at the column edge on a wide screen.</p>',
        'image_right' => true,
    ], ['media_width' => $token, 'content_width' => 'medium', 'style_background_color' => 'shell']);
}

// ── E. Style knobs, against the named palette ─────────────────────────────
// Colours are chosen by NAME and resolve through --palette-{name}, so retuning
// a colour in the admin must move every band here. That is the actual test:
// change "sand" in Settings → Theme and watch these follow.
$text(
    'style_background_color: sand',
    'A palette name, never a hex. If this band is transparent rather than sand, the palette entry is gone — which is the exact failure the deletion guard now blocks.',
    ['style_background_color' => 'sand', 'content_width' => 'medium']
);

$text(
    'style_text_color: bronze',
    'Copy inherits the palette colour. Headings included — a heading that stays dark means the colour is not inheriting past the section root.',
    ['style_text_color' => 'bronze', 'content_width' => 'medium']
);

$text(
    'style_background_color: ink + style_text_color: sand',
    'The pairing operators actually reach for. Check contrast survives, and that the band paints edge to edge behind the inset text.',
    ['style_background_color' => 'ink', 'style_text_color' => 'sand', 'style_padding_top' => 'lg', 'style_padding_bottom' => 'lg', 'content_width' => 'medium']
);

// A SECTION THAT PAINTS ITS OWN BAND. Everything above uses text-block's
// `light` theme, whose root is transparent — so none of it exercises the rule
// that clears a section's own background when a knob sets one. That blind spot
// let a real regression through review: with the image knob alone, a
// self-painting root covered the wrapper's image and showed it only in the
// padding ring. These two bands are the control and the test.
$band('text-block', [
    'eyebrow' => 'theme: cream, NO colour knob',
    'heading' => 'The quick brown fox jumps over the lazy dog',
    'body' => '<p>The partial paints this band itself (#f0e6da). Nothing here should be touched by the style knobs — a section with no knob set keeps its own CSS, which is the rule the whole knob system rests on.</p>',
    'theme' => 'cream',
], ['content_width' => 'medium']);
$band('text-block', [
    'eyebrow' => 'theme: cream + style_background_color: navy',
    'heading' => 'The quick brown fox jumps over the lazy dog',
    'theme' => 'cream',
    'body' => '<p>Same section type as the band above, still painting cream itself, but with a colour knob set. It must read NAVY: the knob has to clear the partial\'s own background, not layer under it. If this is cream, the clearing rule has stopped winning on specificity.</p>',
], ['style_background_color' => 'navy', 'style_text_color' => 'sand', 'style_padding_top' => 'md', 'style_padding_bottom' => 'md', 'content_width' => 'medium']);

// A BACKGROUND IMAGE ON A SELF-PAINTING SECTION. This is the exact case that
// got past review: the image paints on the wrapper, so a section root that
// paints its own opaque band covers it and leaves the image showing only in
// the padding ring. The colour knob is deliberately NOT set here — sharing one
// clearing rule with `sx-bg` is what makes this work, and a band that also set
// a colour would pass even if that sharing were undone.
//
// Media is looked up by NAME rather than by id, so this survives a database
// where ids differ. If the image is missing the band simply renders without
// one, which is a weaker test but never a crash.
$band('text-block', [
    'eyebrow' => 'theme: cream + style_background_image, NO colour knob',
    'heading' => 'The quick brown fox jumps over the lazy dog',
    'body' => '<p>The image must fill this whole band. If it appears only as a frame around a cream centre, the section root is still painting over the wrapper and the clearing rule has stopped covering the image knob.</p>',
    'theme' => 'cream',
], array_filter([
    'style_background_image' => $bgImage,
    'style_padding_top' => 'lg', 'style_padding_bottom' => 'lg',
    'content_width' => 'medium',
]));

// IMAGE-TEXT-SPLIT, the known awkward customer. Its root once carried
// `z-index: -1` from the Figma export, which paints a positioned element BELOW
// the background of its non-positioned ancestors — so the moment the wrapper
// started painting, a background colour here blanked the entire section at
// >=768px while mobile still looked right. The z-index is gone; this band is
// here so nothing puts it back.
$band('image-text-split', [
    'eyebrow' => 'image-text-split + background colour',
    'heading' => 'Content must survive the band behind it',
    'body' => '<p>Every element of this section has to remain visible on top of the sand band. If this reads as a flat coloured rectangle, a stacking context has come back onto the section root.</p>',
    'cta_label' => 'Still here',
    'cta_url' => '#',
], ['style_background_color' => 'sand', 'style_padding_top' => 'md', 'style_padding_bottom' => 'md', 'content_width' => 'wide']);

// ── E2. CONTROLS ON A DARK BAND ────────────────────────────────────────────
// The fixture for finishing style_text_color. Copy and headings follow the knob
// as of 2026-08-25; buttons, links and icons still set their own colour
// directly, and a direct rule beats inheritance however specific the ancestor.
// So these two bands are expected to show readable copy next to an unreadable
// control until that sweep lands — which is the point of having them.
//
// A prose LINK is included deliberately: a link inside authored copy should
// follow the operator's colour, whereas a solid-background button probably
// should not. Those are different answers and need different fixtures.
$band('text-block', [
    'eyebrow' => 'E2a — prose link on a dark band',
    'heading' => 'A link in authored copy',
    'body' => '<p>This paragraph contains <a href="#">an inline link</a> that an operator would expect to be readable. If it renders in the theme accent against ink, the link colour is not deferring to the knob yet.</p>',
], ['style_background_color' => 'ink', 'style_text_color' => 'sand', 'style_padding_top' => 'md', 'style_padding_bottom' => 'md', 'content_width' => 'medium']);

// final-cta renders BOTH a solid primary button and a secondary one, which is
// the pairing that decides the rule: if button text follows the knob but the
// button's own background does not, the knob creates a NEW unreadable
// combination rather than fixing one.
$band('final-cta', [
    'eyebrow' => 'E2b — buttons on a dark band',
    'heading' => 'Both buttons must stay legible',
    'lead' => 'Primary is solid, secondary is not. They are expected to need different answers.',
    'primary_cta_label' => 'Primary action',
    'primary_cta_url' => '#',
    'secondary_cta_label' => 'Secondary action',
    'secondary_cta_url' => '#',
], [
    'style_background_color' => 'ink',
    'style_text_color' => 'sand',
    // The knobs this band exists to prove. The button label is NOT chosen —
    // it is derived from the fill's luminance, so picking `bronze` must give a
    // readable label without the operator thinking about contrast at all.
    'style_button_color' => 'bronze',
    // NOT `gold` — that is what the accents already are, so it would prove
    // nothing. `sand` is visibly different from the default.
    'style_accent_color' => 'sand',
    'style_padding_top' => 'lg', 'style_padding_bottom' => 'lg',
    'content_width' => 'medium',
]);

// THE BUTTON KNOB'S OPT-OUT. `.ps-cardButton` renders both on the band (from
// FaqSection) and inside `.ps-card`, which owns its own colours. With a button
// knob set on this section, the CARD's buttons must stay white-on-black while
// the knob is plainly in force on the band around them.
$band('package-slider', [
    'eyebrow' => 'E5 — button knob must not reach into the card',
    'heading' => 'Card buttons keep their own colours',
    'subhead' => 'The knob below sets a shell button fill. Every card button here must stay white on black.',
    'mode' => 'featured',
    'limit' => 3,
    'price_intro_label' => 'First month',
    'price_recurring_label' => 'Recurring',
    'cta_label' => 'Start my {package}',
    'cta_url' => '#get-started',
], ['style_button_color' => 'shell', 'style_background_color' => 'ink', 'style_text_color' => 'sand', 'content_width' => 'wide']);

// TWO OPPOSING SURFACES UNDER ONE KNOB. faq-categories is the section that
// broke the classification: its intro and filter pills sit on the band, but
// `.faq-cats__panel` paints its own cream card INSIDE .sx-content, where the
// section background knob cannot reach it. Converting the panel's questions and
// answers to follow rendered them sand-on-cream at about 1.3:1.
//
// So this band must show a dark ink band with light intro/pills ABOVE a cream
// panel with dark questions inside it. If the questions are pale, the panel
// interiors have been converted to follow again and no colour can save them.
// `mode: all` pulls the live FAQ dataset, so the panel has real rows in it.
$band('faq-categories', [
    'eyebrow' => 'E3 — two surfaces, one knob',
    'heading' => 'Band copy follows, panel copy must not',
    'description' => 'This line and the filter pills sit on the band and take the operator colour. Everything inside the cream panel below keeps its own.',
    'mode' => 'all',
    'show_filters' => true,
    'open_first' => true,
], ['style_background_color' => 'ink', 'style_text_color' => 'sand', 'style_padding_top' => 'lg', 'style_padding_bottom' => 'lg', 'content_width' => 'wide']);

// A HERO WITH NO IMAGE. It used to render at ZERO HEIGHT: the stage takes its
// height from the slide image and `.box-content` is absolutely positioned, so
// a headline-only hero reported has_content: true and showed nothing at all.
// This band must be visibly tall with its headline centred in it.
$band('hero', [
    'layout' => 'slider',
    'eyebrow' => 'E4 — hero with no image',
    'headline' => 'A headline alone must still occupy space',
    'subhead' => 'If this band is invisible, the no-media floor has been removed.',
], ['style_background_color' => 'shell', 'content_width' => 'wide']);

// ── G. Per-breakpoint overrides ───────────────────────────────────────────
// THIS IS THE ONLY GROUP YOU HAVE TO RESIZE THE WINDOW TO READ. Every other
// band on the bench is a still life; these change under you, and a band that
// does NOT change is the bug.
//
// The three breakpoints that matter are 390 (base/mobile), 800 (md is 768, lg
// is 992, so only the md override is live) and 1200 (both live, lg wins).
//
// The base value is the MOBILE value — the suffixed keys override upward. That
// direction is not arbitrary: the rest of the stylesheet is written mobile-first
// with `up()`, and on this site phones are the majority, so the common case
// gets the plain rule and the exceptions get the media queries.
$text(
    'G1 — align: left → centre at 768 → right at 992',
    'Resize slowly through 768 and 992. The text should swing left, then centre, then right. A step that never arrives means the tier setter lost to its own base: a media query adds NO specificity, so if the base rule is emitted after the tiers it wins at every width and the override is dead while looking perfectly correct in the payload.',
    [
        'content_align' => 'left',
        'content_align_md' => 'center',
        'content_align_lg' => 'right',
        'style_background_color' => 'sand',
        'content_width' => 'medium',
    ]
);

$text(
    'G2 — a TABLET-ONLY override, with no base value at all',
    'The nastiest shape, and the reason a marker class exists. Only content_align_md is set here, so this band carries NO base alignment class. A consumer rule guarded on the list of base classes would match nothing and this override would do nothing at all — silently, with the right value sitting in the payload. Below 768 this reads left (inherited, untouched); at 768 and up it must centre.',
    [
        'content_align_md' => 'center',
        'style_background_color' => 'shell',
        'content_width' => 'medium',
    ]
);

$text(
    'G3 — flush on the phone, normal inset from the tablet up',
    'The pairing the flush token exists for, and the reason it and the tiers landed in one commit rather than two. Under 768 this text should touch both screen edges; at 768 and up it should pull in to a normal medium inset. A width cap is set as well ON PURPOSE — content_width emits `margin-inline: auto` at the same specificity as the inset consumer, so if the two rules are emitted in the wrong order the cap silently cancels the flush and only this band would show it.',
    [
        'content_inset' => 'flush',
        'content_inset_md' => 'md',
        'content_width' => 'medium',
        'style_background_color' => 'sand',
    ]
);

$text(
    'G4 — vertical padding that shrinks on the phone',
    'The operator case the whole tier system was asked for: a section that is generous on a desktop and tight on a phone, because a phone has no room to spend on whitespace. Large above and below at 992+, small under 768. Watch the coloured band grow and shrink, not just the gap around the words.',
    [
        'style_padding_top' => 'sm',
        'style_padding_bottom' => 'sm',
        'style_padding_top_lg' => 'lg',
        'style_padding_bottom_lg' => 'lg',
        'style_background_color' => 'shell',
        'content_width' => 'medium',
    ]
);

// ── H. The section frame: border and radius ───────────────────────────────
// Both paint the same box the background does, which is why the wrapper's
// bleed had to be fixed (c43e9a7) before either could land.
//
// THE RADIUS BANDS MUST NOT REACH THE SCREEN EDGE, and that is the assertion,
// not a side effect. A radius means "make this section a card": it cancels the
// wrapper's bleed so the band comes to rest inside the page gutter with its
// corners visible. A rounded band running to the glass would show its corners
// as a curve cut out of the page, which is the same thing full-bleed media
// squares its own corners to avoid.
$text(
    'H1 — border, no radius: still full-bleed',
    'A bordered band with square corners keeps running edge to edge, so the top and bottom rules should cross the whole screen and the side rules should sit exactly ON the left and right edges. This is the "full-width band with a rule along it" design, and it is why border did not simply follow radius out of the bleed.',
    [
        'style_border_color' => 'ink',
        'style_border_width' => 'md',
        'style_background_color' => 'sand',
        'content_width' => 'medium',
    ]
);

foreach (['sm', 'md', 'lg'] as $token) {
    $text(
        "H2 — style_radius: {$token} (band becomes a card)",
        'Read the SIDE gaps, not just the corners. This band should sit a page gutter in from both screen edges — that is the radius cancelling the bleed. If the band still touches the glass and the corners are clipped into it, the un-bleed is not firing, or the inner section has escaped the card it is meant to be inside.',
        [
            'style_radius' => $token,
            'style_border_color' => 'ink',
            'style_border_width' => 'sm',
            'style_background_color' => 'shell',
            'content_width' => 'medium',
        ]
    );
}

$text(
    'H3 — style_radius: none is NOT the same as leaving it unset',
    'Square corners AND full bleed: this band should touch both screen edges like H1, not sit inset like H2. `none` is an explicit choice to keep the band full-width, so it is excluded from the rule that un-bleeds a rounded band — otherwise picking "square" would silently box a section that was edge to edge before.',
    [
        'style_radius' => 'none',
        'style_border_color' => 'ink',
        'style_border_width' => 'md',
        'style_background_color' => 'sand',
        'content_width' => 'medium',
    ]
);

// ── F. The regressions, each one a bug this project has actually shipped ───

// F1. Typed sub-blocks. Hero is the only type that takes children today, and
// two or more testimonial cards become a mini slider. The child wears sxb-*
// knobs, NEVER sx-* — a child in section clothing bleeds out of its parent's
// column and takes the parent's inset twice.
// The highlights slot belongs to the SLIDER layout, not the banner.
//
// AN IMAGE IS REQUIRED HERE, and finding that out was itself a result: a
// headline alone is enough for HeroSection to build a slide, but the slideshow
// stage takes its height from the slide image, so an image-less hero renders at
// ZERO HEIGHT. It reports has_content: true, occupies no space, and is silently
// invisible — measured at 1440px on 2026-08-25. Worth deciding whether the
// component should carry a min-height; until then the bench sets an image so
// the sub-block fixture below is actually on screen.
$band('hero', [
    'layout' => 'slider',
    'background_image' => $bgImage,
    'eyebrow' => 'F1 — typed sub-blocks',
    'headline' => 'Two children become a mini slider',
    'subhead' => 'One child renders as a single card. This band has two, so it should slide.',
    'children' => [
        [
            'type' => 'testimonial',
            'data' => [
                'title' => 'First card',
                'subtitle' => 'SXB KNOBS',
                'quote' => '<p>"The child carries its own inset and width, under the sxb-* vocabulary."</p>',
                'content_inset' => 'sm',
            ],
        ],
        [
            'type' => 'testimonial',
            'data' => [
                'title' => 'Second card',
                'subtitle' => 'CHILD KNOBS ONLY',
                'quote' => '<p>"This card sets its OWN background and text. Both must win over the section knob below, and the card\'s own dark panel must not cover the colour."</p>',
                'content_inset' => 'lg',
                // Proves two things at once: the child background knob is not
                // covered by the block's own panel (it was, until the clearing
                // rule landed), and the child text knob beats the section's.
                'style_background_color' => 'bronze',
                'style_text_color' => 'ink',
            ],
        ],
    ],
    // A SECTION-level text knob that must NOT reach either card. The cards keep
    // their own dark panel, so copy following the band would be unreadable —
    // this is the pairing the whole sweep exists to prevent.
], ['content_width' => 'wide', 'style_text_color' => 'sand']);

// F2. An unregistered, schema-less backend type WITH real content.
// Expected: in dev, PlaceholderSection dumps the payload. In production, the
// whole entry is dropped and a warning is logged — no empty band, no residue.
// The knobs below are the point: they are what turned "returns null" into a
// padded, painted, empty band when the gate was set inside the component
// instead of above the knob wrapper.
$band('pricing-tiers', [
    'eyebrow' => 'F2 — unregistered type, must vanish in production',
    'main_tiers' => [
        ['name' => 'If you can read this in production, the drop is broken'],
    ],
], ['style_padding_top' => 'lg', 'style_padding_bottom' => 'lg', 'style_background_color' => 'gold', 'content_width' => 'medium']);

// F3. An empty scaffold — every content field null, knobs set.
// Expected: renders nothing, everywhere. has_content is computed by the
// backend, which is the only side that knows which keys are structural.
$band('text-block', [
    'eyebrow' => null,
    'heading' => null,
    'body' => null,
], ['style_padding_top' => 'lg', 'style_padding_bottom' => 'lg', 'style_background_color' => 'navy']);

// F4. Closing marker. If you can see this, the bench rendered to the end and
// F2/F3 above it left nothing behind — which is exactly what they should do.
$text(
    'F4 — end of bench',
    'What belongs above this line depends on how the site is being served, and the difference is the point. On a PRODUCTION build there must be no gold band and no navy band — a coloured gap there means F2 or F3 leaked an empty wrapper. On a DEV server the gold band is CORRECT: F2 renders its payload as a visible JSON dump, because an unregistered type is meant to be loud while you are building it and silent once it is live.',
    ['content_width' => 'medium', 'style_padding_top' => 'md', 'style_padding_bottom' => 'md']
);

// ── I. Section types that are not knob scales ────────────────────────────
// The bench is mostly SCALES, but a new section type still needs somewhere to
// be looked at before it goes on a real page. One band per type, with every
// optional field populated — a type whose optional fields are all empty in the
// only place it is rendered is a type whose empty states were never checked.

// I1. quiz-cta with everything filled: the composed case.
$band('quiz-cta', [
    'eyebrow' => 'I1 — quiz CTA, all fields',
    'heading' => 'Get your free <em>peptide report</em>.',
    'heading_level' => 'h2',
    'body' => '<p>Answer a few quick questions and we build your personalised report. <b>It unlocks member pricing and a free 15-minute review.</b></p>',
    'cta_label' => 'Get my free report',
    'cta_mode' => 'link',
    // Points at the real quiz page. It used to be '/consultation', which no
    // page or route has ever had — so the bench's own CTA 404'd through the
    // catch-all, in the one band whose whole job is to demonstrate a CTA.
    'cta_url' => '/find-your-protocol',
    'cta_icon' => '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'cta_subtext' => 'Takes 2 minutes · No payment',
    'badges' => [
        ['label' => 'Advisor-reviewed', 'icon' => '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 4 6v6c0 4.5 3.2 7.5 8 9 4.8-1.5 8-4.5 8-9V6l-8-3Z" stroke="currentColor" stroke-width="1.6"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
        ['label' => 'Third-party tested', 'icon' => '<svg viewBox="0 0 24 24" fill="none"><path d="M9 3h6l-1 4h-4L9 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 7v3.5L6 18a2 2 0 0 0 1.8 3h8.4A2 2 0 0 0 18 18l-4-7.5V7" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'],
        ['label' => 'Ready in minutes', 'icon' => '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
    ],
    'media_caption' => 'Your report',
], ['content_width' => 'wide', 'style_padding_top' => 'lg', 'style_padding_bottom' => 'lg']);

// I1b — THE FULL COMPOSITION, and the reason it exists: every other quiz-cta
// band leaves `media` null, so the two-column variant, the image and the seal
// had never rendered anywhere on this bench. A code path with no fixture is an
// untested one, and this is the arrangement the section was designed for —
// copy left, report cover right.
//
// It also proves the dark treatment is reachable through KNOBS alone —
// background colour and text colour by palette NAME, no per-section CSS. If
// this band needs a stylesheet edit to look right, the Style panel is not
// doing its job.
$band('quiz-cta', [
    'eyebrow' => 'I1b — quiz CTA, dark + media',
    'heading' => 'Get your free <em>peptide report</em>.',
    'heading_level' => 'h2',
    'body' => '<p>Answer a few quick questions and we build your personalised report. <b>It unlocks member pricing and a free 15-minute review.</b></p>',
    'cta_label' => 'Get my free report',
    'cta_mode' => 'link',
    'cta_url' => '/find-your-protocol',
    'cta_icon' => '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'cta_subtext' => 'Takes 2 minutes · No payment',
    'badges' => [
        ['label' => 'Advisor-reviewed', 'icon' => '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 4 6v6c0 4.5 3.2 7.5 8 9 4.8-1.5 8-4.5 8-9V6l-8-3Z" stroke="currentColor" stroke-width="1.6"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
        ['label' => 'Third-party tested', 'icon' => '<svg viewBox="0 0 24 24" fill="none"><path d="M9 3h6l-1 4h-4L9 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 7v3.5L6 18a2 2 0 0 0 1.8 3h8.4A2 2 0 0 0 18 18l-4-7.5V7" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'],
        ['label' => 'Ready in minutes', 'icon' => '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
    ],
    // A curator ID, which is what the admin's own picker stores and what
    // MediaResolver turns into {id, url, alt, width, height} at serve time.
    // NOT a path string — those are what cms:backfill-section-media exists to
    // repair, and this script must not write more of them.
    'media' => $reportCover,
    'media_caption' => 'Your report',
], [
    'style_background_color' => 'navy',
    'style_text_color' => 'shell',
    // BOTH of these are needed and the first run of this band proved why.
    // style_text_color alone made the headline's <em> accent the same colour
    // as the rest of the headline (the emphasis vanished) and left the button
    // black-on-navy. They are separate knobs on purpose: copy, the accent it
    // highlights with, and the CTA are three different jobs, and a band that
    // sets only the first looks broken in a way that reads as a CSS bug
    // rather than an unset field.
    'style_accent_color' => 'bronze',
    'style_button_color' => 'bronze',
    'content_width' => 'xwide',
    'style_padding_top' => 'lg',
    'style_padding_bottom' => 'lg',
]);

// I2. The same type with ONLY its required field. Everything optional is
// absent: no eyebrow, no pitch, no icon, no reassurance line, no badges, no
// image. Expected: a headline and nothing else — no empty pill row, no orphan
// halo, no stray button. This is the band that catches a component which
// renders its wrappers before checking whether they have contents.
$band('quiz-cta', [
    'heading' => 'I2 — quiz CTA, headline only: nothing else may render',
], ['content_width' => 'medium', 'style_padding_top' => 'md', 'style_padding_bottom' => 'md']);

echo "Built /test-page with {$position} sections.\n";
echo "Expected to RENDER: ".($position - 2)." (F2 and F3 must render nothing in production).\n";
