<?php

/**
 * Dev-only: seeds this deployment's colour palette with the names the Atlas
 * theme actually paints its sections in.
 *   php artisan tinker /var/www/html/atlas-protocol-web/scripts/atlas-palette-fill.php
 *
 * WHY THIS EXISTS. The section Style panel offers colours BY NAME from
 * ThemeSettings::$palette. Until the palette holds the theme's real colours,
 * an operator opening that panel can pick nothing that matches what the site
 * already looks like — the control would be present but unusable, which is
 * worse than absent.
 *
 * The five hexes already in ThemeSettings (primary/accent/background/text)
 * are the brand colours; they are NOT the colours the section bands use. The
 * values below are read from public/scss/abstracts/_variable.scss on the
 * frontend, which is the theme's own source of truth for them.
 *
 * Atlas-specific, so it lives here and not in a backend seeder — prx-backend
 * ships content-free. Re-running is safe: entries are matched by name, and
 * an operator's own edits to a colour are PRESERVED rather than reset.
 */

use App\Actions\Settings\UpdateThemeSettingsAction;
use App\Data\Settings\ThemeSettingsData;
use App\Settings\ThemeSettings;

/** name => hex, from the frontend theme's _variable.scss. */
$themeColors = [
    'sand' => '#F0E6DA',   // --color-sand, the dominant warm band
    'shell' => '#f6f1ed',  // --atlas-bg
    'white' => '#ffffff',  // --white
    'ink' => '#000000',    // --dark
    'charcoal' => '#282828', // --dark-3
    'navy' => '#101828',   // --dark-2
    'bronze' => '#B18D68', // --primary
    'gold' => '#89613b',   // --color-gold
    'line' => '#ebebeb',   // --line, for borders
];

$settings = app(ThemeSettings::class);

// Keep whatever the operator already named; only add what is missing.
$existing = [];
foreach ($settings->palette as $entry) {
    if (filled($entry['name'] ?? null)) {
        $existing[$entry['name']] = $entry['color'] ?? null;
    }
}

$palette = $settings->palette;
$added = [];

foreach ($themeColors as $name => $color) {
    if (array_key_exists($name, $existing)) {
        continue;
    }

    $palette[] = ['name' => $name, 'color' => $color];
    $added[] = $name;
}

if ($added === []) {
    echo "palette already complete; nothing added\n";

    return;
}

app(UpdateThemeSettingsAction::class)->execute(
    ThemeSettingsData::from([...$settings->toArray(), 'palette' => $palette])
);

echo 'added: '.implode(', ', $added)."\n";
echo 'palette is now '.count($palette)." colours\n";
