"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { money } from "@/components/sections/support";
import { fetchLeadIntake, markIntakeComplete } from "@/lib/checkoutClient";

/**
 * The clinical intake, hosted on THIS site.
 *
 * WHY IT MOVED. The provider's embed used to be served from a page on the
 * admin domain. That put the clinical step outside the storefront — away from
 * its branding, its compliance copy and its cart — and a visitor there had no
 * way back and lost everything they had typed if they pressed back. The embed
 * is an iframe; nothing about it requires the host page to be the provider's.
 *
 * WHAT IS AND IS NOT STORED HERE. The lead is already persisted before this
 * page loads, so a refresh or a return trip re-reads it from the API rather
 * than losing it. Clinical answers are typed inside the provider's iframe and
 * never touch this origin — that separation is the point of the embed, and
 * nothing here should be changed to reach into it.
 *
 * HOW THE WIZARD DECIDES WHICH STEPS TO SHOW, since it governs everything
 * here: a conditional step declares `for_product_ids` / `for_package_ids` /
 * `for_product_type_ids` / `for_product_class_ids`, and renders when the
 * selection matches ANY of them — a concrete product (its own id, or its type
 * and class walked up), an injected type, or an injected class. So the
 * selection is not decoration; it is what makes the clinical questions appear.
 *
 * SELECTIONS ARE INJECTED IN `onReady`, per their documented host snippet.
 * They are also passed at init, which the SDK forwards over the same
 * postMessage channel — belt and braces, and harmless because both paths carry
 * identical values. `onReady` can fire again if the iframe's internals remount,
 * so the push is guarded to avoid a postMessage storm.
 *
 * PREFILL MUST TRAVEL BY postMessage. The SDK also writes `prefill_*` into the
 * iframe's query string, but those are NOT read server-side — the init option
 * and the `prefill()` call are the only paths that work.
 */

const SDK_HOSTS = {
  production: "https://prescribe-rx.com",
  sandbox: "https://demo.prescribe-rx.com",
};

function sdkUrl(environment) {
  const host = SDK_HOSTS[environment] ?? SDK_HOSTS.sandbox;
  return `${host}/embed/sdk.js`;
}

/** Load the SDK once per page, resolving when its global is available. */
function loadSdk(environment) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window."));
  }

  if (window.PrescribeRx?.init) {
    return Promise.resolve(window.PrescribeRx);
  }

  const src = sdkUrl(environment);
  const existing = document.querySelector(`script[src="${src}"]`);

  return new Promise((resolve, reject) => {
    const settle = () => {
      if (window.PrescribeRx?.init) {
        resolve(window.PrescribeRx);
      } else {
        reject(new Error("The intake SDK loaded but did not initialise."));
      }
    };

    if (existing) {
      existing.addEventListener("load", settle, { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load the intake SDK.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load the intake SDK.")), { once: true });
    document.head.appendChild(script);
  });
}

export default function IntakeClient({ uuid }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(null);
  const [complete, setComplete] = useState(false);
  const configured = useRef(false);
  const booted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetchLeadIntake(uuid)
      .then((payload) => {
        if (cancelled) return;
        if (!payload?.embed?.embedCode) {
          setError("This intake is not available yet. Please contact us and we'll finish your order.");
          return;
        }
        setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [uuid]);

  const boot = useCallback(async () => {
    if (!data || booted.current) return;
    booted.current = true;

    const { embed, environment } = data;

    try {
      const sdk = await loadSdk(environment);

      sdk.init("prx-intake", {
        embedCode: embed.embedCode,

        // Given at INIT: the universal intake resolves which steps to show
        // from the products it is handed, so it must know before it computes
        // its step list.
        packages: embed.packages ?? [],
        products: embed.products ?? [],
        productTypes: embed.productTypes ?? [],
        productClasses: embed.productClasses ?? [],
        prefill: embed.prefill ?? {},
        skipSteps: embed.skipSteps ?? [],
        minHeight: "420px",

        onReady() {
          // May fire again on an internal remount; re-pushing every value
          // each time is a postMessage storm on the provider's side.
          if (configured.current) return;
          configured.current = true;

          try {
            if (Object.keys(embed.prefill ?? {}).length) sdk.prefill(embed.prefill);
            if (embed.packages?.length) sdk.selectPackages(embed.packages);
            if (embed.products?.length) sdk.selectProducts(embed.products);
            if (embed.productTypes?.length) sdk.selectProductTypes(embed.productTypes);
            // Capability-checked: `selectProductClasses` is new, and a browser
            // holding an older cached SDK would otherwise throw here and lose
            // the whole injection — including the selections that DO work.
            if (embed.productClasses?.length && typeof sdk.selectProductClasses === "function") {
              sdk.selectProductClasses(embed.productClasses);
            }
            if (embed.planIds?.length === 1) sdk.selectPlan(embed.planIds[0]);
            if (embed.skipSteps?.length) sdk.setSkipSteps(embed.skipSteps);
          } catch {
            configured.current = false;
          }
        },

        onStepChange(payload) {
          setStep(payload ? { current: payload.step, total: payload.total, name: payload.stepName } : null);
        },

        onComplete(payload) {
          setComplete(true);

          // Advisory only — it flips the lead to handed-off so this page and
          // the order screens do not have to wait on the webhook, which can
          // lag by seconds to minutes. The signed webhook remains the source
          // of truth; never make a billing or fulfilment decision from this.
          //
          // The server-rendered handoff page had this ping too, against a
          // CSRF/session web route that is unreachable from this origin —
          // moving the embed here dropped it until the API equivalent landed.
          markIntakeComplete(uuid, {
            encounterId: payload?.encounter_id ?? null,
            patientId: payload?.patient_id ?? null,
          });
        },

        onError(payload) {
          // Never log the payload body — it can carry clinical answers.
          setError(payload?.message || "Something went wrong loading the intake.");
        },
      });
    } catch (err) {
      setError(err.message);
    }
  }, [data, uuid]);

  useEffect(() => {
    boot();
  }, [boot]);

  const cart = data?.cart;
  const collectsOnSite = data?.payment?.collect_on_site === true;

  return (
    <div className="ix-page">
      {/* The bar exists so a visitor can always see what they are buying and
          get back to the cart. Its absence on the old provider-hosted page is
          the reason this moved. */}
      <div className="ix-bar">
        <div className="container ix-barInner">
          <Link className="ix-back" href="/checkout">
            <span aria-hidden="true">←</span> Back to cart
          </Link>

          {cart?.items?.length ? (
            <div className="ix-barCart">
              <span className="ix-barItems">
                {cart.items.map((line) => line.name).filter(Boolean).join(" · ")}
              </span>
              {cart.subtotal != null ? (
                <span className="ix-barTotal">{money(cart.subtotal)}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="container ix-shell">
        <header className="ix-head">
          <p className="ix-eyebrow">
            {step ? `Step ${step.current} of ${step.total}` : "Final step"} · Clinical intake
          </p>
          <h1 className="ix-title">{step?.name || "Tell us about your health"}</h1>
          <p className="ix-lede">
            These questions are reviewed by a licensed clinician. Your answers are submitted
            directly to our telehealth partner on their HIPAA-covered platform — they are not
            stored on this site.
          </p>
        </header>

        {error ? (
          <p className="ix-error" role="alert">
            {error}
          </p>
        ) : null}

        {complete ? (
          <div className="ix-done">
            <h2>Thank you — your intake is submitted.</h2>
            <p>
              A licensed clinician will review it shortly. We&apos;ll email you as soon as there
              is an update on your order.
            </p>
            <Link className="tf-btn btn-dark2 animate-btn" href="/">
              Back to the site
            </Link>
          </div>
        ) : null}

        {/* No border, no fixed height, no overflow. The SDK grows the iframe to
            its content, so any cap here produces a scrollbar inside a
            scrollbar. */}
        <div className="ix-embedHost" hidden={complete} id="prx-intake">
          {!data && !error ? <div className="ix-loading">Loading your intake…</div> : null}
        </div>

        {collectsOnSite && !complete ? (
          <p className="ix-payNote">
            Payment is taken on this site after your intake is reviewed — you won&apos;t be asked
            for card details inside the form above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
