<?php

/**
 * One live call against Klaviyo's Preview List, to settle three things at once:
 * the subscribe envelope, the pinned `revision` header, and — the actual risk —
 * whether this install's private key carries `subscriptions:write`.
 *
 * `test()` only proves the key can READ /accounts/, and a key's scopes are fixed
 * when it is minted, so an install can pass the connection test and fail every
 * subscribe. Nothing but a live call answers it.
 *
 * Writes ONE profile, to the Preview List, with a reserved-domain address.
 */

use App\Integrations\IntegrationRegistry;
use App\Integrations\Messages\ConsentState;
use App\Integrations\Messages\ContactPayload;
use App\Models\Integrations\IntegrationInstance;

$instance = IntegrationInstance::query()->where('provider', 'klaviyo')->firstOrFail();
$driver = app(IntegrationRegistry::class)->driverFor($instance);

$contact = new ContactPayload(
    email: 'atlas-scope-check-20260828@example.com',
    firstName: 'Scope',
    lastName: 'Check',
    attributes: ['scope_check_at' => now()->toIso8601String()],
    consent: ConsentState::forChannels(['email']),
);

echo '── 1. connection (what test() already proved) ──'.PHP_EOL;
try {
    $driver->test($instance);
    echo '   OK'.PHP_EOL;
} catch (Throwable $e) {
    echo '   FAILED: '.$e->getMessage().PHP_EOL;

    return;
}

echo PHP_EOL.'── 2. profile upsert (profiles:write) ──'.PHP_EOL;
try {
    $remoteId = $driver->upsertContact($instance, $contact);
    echo '   OK, remote id: '.$remoteId.PHP_EOL;
} catch (Throwable $e) {
    echo '   FAILED: '.$e->getMessage().PHP_EOL;

    return;
}

echo PHP_EOL.'── 3. THE ONE THAT MATTERS: subscribe (subscriptions:write) ──'.PHP_EOL;
echo '   list: TTisic (Preview List), channel: email, consent: SUBSCRIBED'.PHP_EOL;
try {
    $driver->addToGroup($instance, $remoteId, 'TTisic', $contact);
    echo '   OK — the key carries subscriptions:write and the envelope is accepted.'.PHP_EOL;
} catch (Throwable $e) {
    echo '   FAILED: '.$e->getMessage().PHP_EOL;

    return;
}

echo PHP_EOL.'── 4. control: the same call with NO consent must NOT subscribe ──'.PHP_EOL;
try {
    $driver->addToGroup($instance, $remoteId, 'TTisic', new ContactPayload(
        email: 'atlas-scope-check-20260828@example.com',
    ));
    echo '   OK — took the plain list-add branch, as it should.'.PHP_EOL;
} catch (Throwable $e) {
    echo '   FAILED: '.$e->getMessage().PHP_EOL;
}
