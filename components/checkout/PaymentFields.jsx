"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { fetchGatewayConfig } from "@/lib/checkoutClient";
import {
  cardBrand,
  cardDigits,
  expiryParts,
  formatCardNumber,
  formatCvc,
  formatExpiry,
  isPlausibleCardNumber,
  isPlausibleCvc,
  lastFour,
} from "@/lib/cardInput";

/**
 * Card entry that never lets a card number reach our servers.
 *
 * THE WHOLE DESIGN IS THAT BOUNDARY. The number, expiry and CVC are typed
 * here, handed straight to the gateway's own SDK in the browser, and exchanged
 * for an opaque token. Only the token, the brand and the last four leave this
 * component. Nothing in this file may be added to a request body, written to
 * storage, or logged — and `tokenize()` deliberately returns a NEW object
 * rather than exposing the raw fields to a caller.
 *
 * WHY IT ASKS THE SERVER WHICH GATEWAY TO USE, every time. Merchant accounts
 * rotate as they approach their processing limits, so the gateway is not a
 * build-time constant. More importantly the account that tokenises must be the
 * account that charges — a token minted against one gateway is worthless at
 * another — so the context's `merchant_account_id` travels back with the token
 * and the charge uses that account rather than re-running the selector.
 *
 * The parent calls `tokenize()` via a ref and receives either a payload or a
 * thrown error; it never reads card state.
 *
 * Only Authorize.Net is implemented. The others are scaffolded to fail loudly
 * rather than silently render a form that cannot submit — a card form that
 * breaks at submit, after the visitor has typed their number, is worse than
 * telling them up front.
 */

/** Loads a gateway SDK once, resolving when its global appears. */
function loadScript(src, globalName) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window."));
  }

  if (window[globalName]) {
    return Promise.resolve(window[globalName]);
  }

  const existing = document.querySelector(`script[src="${src}"]`);

  return new Promise((resolve, reject) => {
    const settle = () =>
      window[globalName]
        ? resolve(window[globalName])
        : reject(new Error("The payment library loaded but did not initialise."));

    const fail = () => reject(new Error("Could not load the payment library."));

    if (existing) {
      existing.addEventListener("load", settle, { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });
}

/**
 * Authorize.Net tokenisation.
 *
 * `Accept.dispatchData` is callback-based and reports failure through a
 * `messages.resultCode` of `Error` rather than by throwing, so the promise
 * wrapper has to inspect the result — a naive `resolve(response)` would treat
 * a declined card as a success.
 */
const NOT_LOADED = "E_WC_03";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatch, retrying the one error that means "ask again in a moment".
 *
 * Accept.js pulls further scripts of its own AFTER its `onload` fires, and
 * dispatching in that window returns `E_WC_03: Accept.js is not loaded
 * correctly` — which reads like a misconfiguration and is really a race.
 * Observed against the live sandbox: the identical call fails immediately
 * after load and succeeds a moment later with the same credentials.
 *
 * Retrying on that specific code beats a fixed delay before dispatch: a delay
 * is a guess that slows down every correct submission, and would still lose
 * whenever the network is slower than the guess.
 */
async function dispatchAuthorizeNetWithRetry(sdk, auth, card, attempts = 4) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await dispatchAuthorizeNet(sdk, auth, card);
    } catch (error) {
      if (error.code !== NOT_LOADED || attempt >= attempts - 1) {
        throw error;
      }

      await wait(400 * (attempt + 1));
    }
  }
}

function dispatchAuthorizeNet(sdk, { apiLoginID, clientKey }, card) {
  return new Promise((resolve, reject) => {
    sdk.dispatchData(
      {
        authData: { clientKey, apiLoginID },
        cardData: {
          cardNumber: card.number,
          month: card.month,
          year: card.year,
          cardCode: card.cvc,
        },
      },
      (response) => {
        if (response?.messages?.resultCode === "Error") {
          const first = response.messages.message?.[0];

          // Their text is written for developers ("E_WC_05: ..."), so a card
          // problem gets a human sentence and everything else gets a generic
          // one. The raw code is not surfaced to the visitor — it would mean
          // nothing to them and can hint at gateway internals — but it IS
          // carried on the error so the retry above can act on it.
          const failure = new Error(
            cardMessageFor(first?.code) ?? "We couldn't verify that card. Please check the details and try again.",
          );
          failure.code = first?.code;

          // The CODE is safe to log and is the only way to tell a declined
          // card from a misconfigured gateway from the load race. Card data
          // is never logged — this is the gateway's own error identifier.
          console.warn("[payment] gateway rejected tokenisation:", first?.code, first?.text);
          reject(failure);
          return;
        }

        const opaque = response?.opaqueData;

        if (!opaque?.dataDescriptor || !opaque?.dataValue) {
          reject(new Error("The payment library returned no token. Please try again."));
          return;
        }

        resolve({ data_descriptor: opaque.dataDescriptor, data_value: opaque.dataValue });
      },
    );
  });
}

/** The handful of Accept.js codes that mean "the visitor can fix this". */
function cardMessageFor(code) {
  return {
    E_WC_05: "Please check the card number.",
    E_WC_06: "Please check the expiry month.",
    E_WC_07: "Please check the expiry year.",
    E_WC_08: "That card has expired.",
    E_WC_15: "Please check the security code.",
    E_WC_17: "Please check the name on the card.",
  }[code] ?? null;
}

function Field({ id, label, error, ...props }) {
  return (
    <div className="tf-field style-2 style-3">
      <input
        aria-invalid={error ? "true" : undefined}
        autoComplete="off"
        className="tf-field-input tf-input"
        id={id}
        name={id}
        placeholder=" "
        {...props}
      />
      <label className="tf-field-label" htmlFor={id}>
        {label}
      </label>
      {error ? <p className="ck-error">{error}</p> : null}
    </div>
  );
}

const PaymentFields = forwardRef(function PaymentFields({ onUnavailable }, ref) {
  const [context, setContext] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [errors, setErrors] = useState({});
  const notified = useRef(false);

  const brand = cardBrand(number);

  useEffect(() => {
    let cancelled = false;

    fetchGatewayConfig()
      .then((config) => {
        if (!cancelled) setContext(config);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error.message);

        // Tell the parent once, so it can decide whether checkout can proceed
        // at all rather than leaving a dead form on the page.
        if (!notified.current) {
          notified.current = true;
          onUnavailable?.(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onUnavailable]);

  // Warm the SDK as soon as the gateway is known, so the first submit is not
  // also the first network round trip for a third-party script.
  useEffect(() => {
    if (context?.gateway_provider === "authorize_net" && context.accept_js_url) {
      loadScript(context.accept_js_url, "Accept").catch(() => {
        // Surfaced at tokenise time instead — a preload failure alone should
        // not blank a form the visitor may never submit.
      });
    }
  }, [context]);

  const validate = () => {
    const next = {};

    if (!isPlausibleCardNumber(number)) next.card_number = "Enter the full card number.";
    if (!expiryParts(expiry)) next.card_expiry = "Enter a valid future expiry date.";
    if (!isPlausibleCvc(cvc, brand)) next.card_cvc = "Enter the security code.";

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  useImperativeHandle(ref, () => ({
    /**
     * Exchange the typed card for an opaque token.
     *
     * Throws on any failure so the caller cannot mistake a declined card for a
     * success. The returned object is everything the server needs and nothing
     * more — no PAN, no CVC.
     */
    async tokenize() {
      if (!context) {
        throw new Error("Payment is not ready yet. Please try again in a moment.");
      }

      if (!validate()) {
        throw new Error("Please check the card details.");
      }

      const parts = expiryParts(expiry);

      if (context.gateway_provider !== "authorize_net") {
        throw new Error(`Payment via ${context.gateway_provider} is not supported on this site yet.`);
      }

      const sdk = await loadScript(context.accept_js_url, "Accept");

      const token = await dispatchAuthorizeNetWithRetry(
        sdk,
        { apiLoginID: context.api_login_id, clientKey: context.public_key },
        { number: cardDigits(number), month: parts.month, year: parts.year, cvc },
      );

      return {
        // The account that tokenised. The charge must use THIS one — a token
        // is worthless at any other gateway, and routing may have moved on.
        merchant_account_id: context.merchant_account_id,
        gateway_provider: context.gateway_provider,
        token,
        // Display-only, and what the provider's vaulted-card block wants.
        card: {
          brand,
          last_four: lastFour(number),
          expiration_month: Number(parts.month),
          expiration_year: Number(parts.year),
        },
      };
    },
    isReady: () => Boolean(context),
  }));

  if (loadError) {
    return (
      <p className="ck-formError" role="alert">
        {loadError}
      </p>
    );
  }

  if (!context) {
    return <p className="ck-sectionNote">Loading secure payment…</p>;
  }

  return (
    <div className="pay-fields">
      <div className="mb_16">
        <Field
          error={errors.card_number}
          id="card_number"
          inputMode="numeric"
          label={brand ? `Card number (${brand})` : "Card number"}
          onChange={(event) => setNumber(formatCardNumber(event.target.value))}
          value={number}
        />
      </div>
      <div className="ck-grid2">
        <Field
          error={errors.card_expiry}
          id="card_expiry"
          inputMode="numeric"
          label="Expiry (mm/yy)"
          maxLength={5}
          onChange={(event) => setExpiry(formatExpiry(event.target.value))}
          value={expiry}
        />
        <Field
          error={errors.card_cvc}
          id="card_cvc"
          inputMode="numeric"
          label="Security code"
          onChange={(event) => setCvc(formatCvc(event.target.value, brand))}
          value={cvc}
        />
      </div>
      <p className="pay-note">
        Card details are sent directly to our payment provider and are never stored on this
        site.
      </p>
    </div>
  );
});

export default PaymentFields;
