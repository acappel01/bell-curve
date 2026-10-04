"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { money } from "@/components/sections/support";
import CartUpsells from "@/components/cart/CartUpsells";
import { useCart } from "@/components/cart/CartProvider";
import { createLead } from "@/lib/checkoutClient";
import { referralFields } from "@/lib/referral";
import PaymentFields from "@/components/checkout/PaymentFields";
import US_STATES from "@/data/us-states.json";
import {
  ageFromIso,
  dobForApi,
  formatDob,
  formatPhone,
  isCompletePhone,
  phoneForApi,
} from "@/lib/inputMasks";

/**
 * Checkout intake — the step that happens on THIS site, before the clinical
 * embed.
 *
 * It exists to collect everything the provider's "Personal Information" step
 * would otherwise ask for, so that step can be skipped inside the embed and a
 * visitor is not asked their name twice. Every field here maps to a
 * `POST /leads` column which the backend then sends as the intake `patient`
 * block.
 *
 * TWO RULES WORTH KNOWING BEFORE EDITING:
 *
 *   1. The SHIPPING address is the clinically load-bearing one. Its state
 *      decides which licensed clinician the provider can assign, so it is
 *      required in full. Billing is optional and only collected when it
 *      differs — an incomplete billing address is refused by the API rather
 *      than sent as a partial.
 *   2. Display shape is not transport shape. The phone reads as
 *      (512) 555-0142 and is sent as 512-555-0142; the birth date reads as
 *      mm/dd/yyyy and is sent as ISO. `lib/inputMasks.js` owns both
 *      conversions — never post the display string.
 *
 * Gender is male/female only, deliberately: this is the clinical record, and
 * the provider treats on biological sex. The broader vocabulary still lives on
 * the protocol-builder quiz, which is a different question being asked for a
 * different reason.
 */

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const MIN_AGE = 18;

/** Floating-label text field in the theme's tf-field idiom. */
function Field({ id, label, error, type = "text", ...inputProps }) {
  return (
    <div className="tf-field style-2 style-3">
      <input
        aria-invalid={error ? "true" : undefined}
        className="tf-field-input tf-input"
        id={id}
        name={id}
        placeholder=" "
        type={type}
        {...inputProps}
      />
      <label className="tf-field-label" htmlFor={id}>
        {label}
      </label>
      {error ? <p className="ck-error">{error}</p> : null}
    </div>
  );
}

function StateSelect({ id, value, onChange, error }) {
  return (
    <div className="tf-select select-square">
      <select
        aria-invalid={error ? "true" : undefined}
        autoComplete={id === "state" ? "address-level1" : "off"}
        id={id}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">State</option>
        {US_STATES.map((state) => (
          <option key={state.code} value={state.code}>
            {state.name}
          </option>
        ))}
      </select>
      {error ? <p className="ck-error">{error}</p> : null}
    </div>
  );
}

/**
 * One address block, reused for shipping and billing so the two cannot drift
 * apart in markup or validation. `prefix` namespaces the field ids to match
 * the API's column names exactly.
 */
function AddressFields({ prefix, values, errors, onChange, autoCompleteScope }) {
  const key = (name) => (prefix ? `${prefix}_${name}` : name);
  const scoped = (token) => (autoCompleteScope ? `${autoCompleteScope} ${token}` : token);

  return (
    <>
      <div className="mb_16">
        <Field
          autoComplete={scoped("address-line1")}
          error={errors[key("address_line1")]}
          id={key("address_line1")}
          label="Address"
          onChange={(event) => onChange(key("address_line1"), event.target.value)}
          required
          value={values[key("address_line1")] ?? ""}
        />
      </div>
      <div className="mb_16">
        <Field
          autoComplete={scoped("address-line2")}
          error={errors[key("address_line2")]}
          id={key("address_line2")}
          label="Apartment, suite, etc (optional)"
          onChange={(event) => onChange(key("address_line2"), event.target.value)}
          value={values[key("address_line2")] ?? ""}
        />
      </div>
      <div className="ck-addressGrid">
        <Field
          autoComplete={scoped("address-level2")}
          error={errors[key("city")]}
          id={key("city")}
          label="City"
          onChange={(event) => onChange(key("city"), event.target.value)}
          required
          value={values[key("city")] ?? ""}
        />
        <StateSelect
          error={errors[key("state")]}
          id={key("state")}
          onChange={(next) => onChange(key("state"), next)}
          value={values[key("state")] ?? ""}
        />
        <Field
          autoComplete={scoped("postal-code")}
          error={errors[key("postal_code")]}
          id={key("postal_code")}
          inputMode="numeric"
          label="ZIP code"
          onChange={(event) => onChange(key("postal_code"), event.target.value)}
          required
          value={values[key("postal_code")] ?? ""}
        />
      </div>
    </>
  );
}

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  billing_address_line1: "",
  billing_address_line2: "",
  billing_city: "",
  billing_state: "",
  billing_postal_code: "",
};

export default function CheckoutClient({ checkout }) {
  const { cart } = useCart();
  const paymentRef = useRef(null);
  const [paymentUnavailable, setPaymentUnavailable] = useState(null);

  // The card form exists ONLY when this deployment collects payment itself.
  // Otherwise the provider's embed takes it and no payment UI belongs here —
  // one setting drives both, so the two can never both try to collect.
  const collectsOnSite = checkout?.payment?.collect_on_site === true;
  const [values, setValues] = useState(EMPTY);
  const [billingDiffers, setBillingDiffers] = useState(false);
  const [emailConsent, setEmailConsent] = useState(true);
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [localNotice, setLocalNotice] = useState(false);

  const items = cart?.items ?? [];

  const setField = (name, next) => {
    setValues((current) => ({ ...current, [name]: next }));
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  };

  /**
   * Client-side validation is here so a visitor learns about a problem before
   * filling in the rest of the form — it is not the enforcement point. The API
   * validates every one of these again, and the 18+ rule additionally exists
   * as a provider-side preclusion.
   */
  const validate = () => {
    const next = {};
    const required = {
      first_name: "Enter your first name.",
      last_name: "Enter your last name.",
      email: "Enter your email address.",
      address_line1: "Enter your street address.",
      city: "Enter your city.",
      state: "Select your state.",
      postal_code: "Enter your ZIP code.",
    };

    for (const [name, message] of Object.entries(required)) {
      if (!values[name]?.trim()) {
        next[name] = message;
      }
    }

    if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      next.email = "Enter a valid email address.";
    }

    if (!values.gender) {
      next.gender = "Select one — the prescribing clinician needs this to treat.";
    }

    if (!isCompletePhone(values.phone)) {
      next.phone = "Enter a 10-digit mobile number.";
    }

    const iso = dobForApi(values.date_of_birth);

    if (!iso) {
      next.date_of_birth = "Enter your date of birth as mm/dd/yyyy.";
    } else if ((ageFromIso(iso) ?? 0) < MIN_AGE) {
      next.date_of_birth = `You must be at least ${MIN_AGE} to order.`;
    }

    if (billingDiffers) {
      const billingRequired = {
        billing_address_line1: "Enter your billing street address.",
        billing_city: "Enter your billing city.",
        billing_state: "Select your billing state.",
        billing_postal_code: "Enter your billing ZIP code.",
      };

      for (const [name, message] of Object.entries(billingRequired)) {
        if (!values[name]?.trim()) {
          next[name] = message;
        }
      }
    }

    return next;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setLocalNotice(false);

    const found = validate();

    if (Object.keys(found).length) {
      setErrors(found);
      setFormError("Please review the highlighted fields.");
      return;
    }

    setErrors({});

    // TOKENISE BEFORE CREATING THE LEAD. A declined card would otherwise
    // leave a lead row behind on every attempt, and the visitor would be
    // counted as handed-off when nothing was paid. The card never reaches our
    // servers either way — only the opaque token this returns.
    let payment = null;

    if (collectsOnSite) {
      setSubmitting(true);

      try {
        payment = await paymentRef.current?.tokenize();
      } catch (error) {
        setFormError(error.message);
        setSubmitting(false);
        return;
      }
    }

    const trimmed = (name) => values[name]?.trim() || null;

    const payload = {
      first_name: trimmed("first_name"),
      last_name: trimmed("last_name"),
      email: trimmed("email"),
      // Display shape stays in the field; transport shape goes on the wire.
      phone: phoneForApi(values.phone),
      date_of_birth: dobForApi(values.date_of_birth),
      gender: values.gender || null,
      address_line1: trimmed("address_line1"),
      address_line2: trimmed("address_line2"),
      city: trimmed("city"),
      state: trimmed("state"),
      postal_code: trimmed("postal_code"),
      country: "US",
      billing_same_as_shipping: !billingDiffers,
      billing_address_line1: billingDiffers ? trimmed("billing_address_line1") : null,
      billing_address_line2: billingDiffers ? trimmed("billing_address_line2") : null,
      billing_city: billingDiffers ? trimmed("billing_city") : null,
      billing_state: billingDiffers ? trimmed("billing_state") : null,
      billing_postal_code: billingDiffers ? trimmed("billing_postal_code") : null,
      billing_country: billingDiffers ? "US" : null,
      email_consent: emailConsent,
      sms_consent: smsConsent,
      checkout_path: checkout?.path === "local" ? "local" : "prx",
      // THE BACKEND RESOLVES THESE BY resource_type + resource_id, and it is
      // what the clinical embed reads to know which products to render steps
      // for. This used to send `{type: "Product", name: …}` — the cart API's
      // display shape, where `type` is a class basename and `id` is the CART
      // LINE, not the product. Nothing matched, nothing failed, and the embed
      // opened with no products selected. Send the identifiers, not the
      // labels.
      cart_items: items
        .filter((line) => line.item?.id)
        .map((line) => ({
          resource_type: String(line.type ?? "").toLowerCase(),
          resource_id: line.item.id,
          quantity: line.quantity ?? 1,
          name: line.item?.name ?? null,
          unit_price: line.unit_price ?? null,
        })),
      cart_subtotal: cart?.subtotal ?? null,
      // THE CHECKOUT PATH SENT NO ATTRIBUTION AT ALL until this landed, so every
      // buyer who skipped the quiz was unattributed — the exact case a
      // commission is owed on. Read from the cookies middleware set at landing.
      ...referralFields(),
      // Present only when this site collects. Carries the opaque token and the
      // account it was minted against — never a card number.
      payment,
    };

    setSubmitting(true);

    try {
      const lead = await createLead(payload);

      if (payload.checkout_path === "prx" && lead?.uuid) {
        // Continue to OUR OWN intake route, not the backend's `handoff_url`.
        // This app owns its URL patterns, and hosting the embed here keeps the
        // clinical step inside the site's branding and compliance copy with a
        // route back to the cart. Keep `submitting` true so the button stays
        // disabled during navigation rather than flashing back to idle.
        window.location.assign(`/checkout/intake/${encodeURIComponent(lead.uuid)}`);
        return;
      }

      setLocalNotice(true);
      setSubmitting(false);
    } catch (error) {
      const apiErrors = error.errors ?? {};

      setErrors(
        Object.fromEntries(
          Object.entries(apiErrors).map(([name, messages]) => [name, messages?.[0] ?? ""]),
        ),
      );
      setFormError(
        Object.keys(apiErrors).length
          ? "Please review the highlighted fields."
          : error.message,
      );
      setSubmitting(false);
    }
  };

  const summary = useMemo(
    () => ({
      count: items.reduce((total, line) => total + (line.quantity ?? 1), 0),
      subtotal: cart?.subtotal ?? 0,
    }),
    [items, cart?.subtotal],
  );

  if (!items.length) {
    return (
      <div className="flat-spacing-25">
        <div className="container">
          <div className="ck-empty">
            <p className="text-lg fw-medium">Your cart is empty.</p>
            <Link className="tf-btn btn-dark2 animate-btn" href="/stacks">
              Explore products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flat-spacing-25">
      <div className="container">
        <form className="row ck-form" noValidate onSubmit={onSubmit}>
          <div className="col-xl-8">
            <div className="tf-checkout-cart-main">
              <div className="box-ip-checkout">
                <div className="ck-sectionHead">
                  <h2 className="ck-sectionTitle">Your details</h2>
                  <p className="ck-sectionNote">
                    Entering these here means you won&apos;t be asked again during the medical
                    intake.
                  </p>
                </div>

                {formError ? (
                  <p className="ck-formError" role="alert">
                    {formError}
                  </p>
                ) : null}

                <div className="ck-grid2 mb_16">
                  <Field
                    autoComplete="given-name"
                    error={errors.first_name}
                    id="first_name"
                    label="First name"
                    onChange={(event) => setField("first_name", event.target.value)}
                    required
                    value={values.first_name}
                  />
                  <Field
                    autoComplete="family-name"
                    error={errors.last_name}
                    id="last_name"
                    label="Last name"
                    onChange={(event) => setField("last_name", event.target.value)}
                    required
                    value={values.last_name}
                  />
                </div>

                <div className="ck-grid2 mb_16">
                  <Field
                    autoComplete="email"
                    error={errors.email}
                    id="email"
                    inputMode="email"
                    label="Email"
                    onChange={(event) => setField("email", event.target.value)}
                    required
                    type="email"
                    value={values.email}
                  />
                  <Field
                    autoComplete="tel"
                    error={errors.phone}
                    id="phone"
                    inputMode="tel"
                    label="Mobile phone"
                    onChange={(event) => setField("phone", formatPhone(event.target.value))}
                    required
                    type="tel"
                    value={values.phone}
                  />
                </div>

                <div className="ck-grid2 mb_16">
                  <div className="ck-dobField">
                    <Field
                      autoComplete="bday"
                      error={errors.date_of_birth}
                      id="date_of_birth"
                      inputMode="numeric"
                      label="Date of birth (mm/dd/yyyy)"
                      maxLength={10}
                      onChange={(event) => setField("date_of_birth", formatDob(event.target.value))}
                      required
                      value={values.date_of_birth}
                    />
                    {/* Native picker beside the masked field: typing is the
                        fast path on desktop, the calendar is the fast path on
                        a phone. Both write the same masked value. */}
                    <label className="ck-dobPicker">
                      <span className="visually-hidden">Pick your date of birth from a calendar</span>
                      <input
                        aria-label="Pick your date of birth from a calendar"
                        onChange={(event) => {
                          const iso = event.target.value;
                          if (!iso) return;
                          const [y, m, d] = iso.split("-");
                          setField("date_of_birth", `${m}/${d}/${y}`);
                        }}
                        tabIndex={-1}
                        type="date"
                      />
                      <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                        <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.6" width="18" x="3" y="5" />
                        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    </label>
                  </div>

                  <fieldset className="ck-radioGroup" aria-invalid={errors.gender ? "true" : undefined}>
                    <legend className="ck-radioLegend">Sex at birth</legend>
                    <div className="ck-radioRow">
                      {GENDER_OPTIONS.map((option) => (
                        <label className="ck-radio" key={option.value}>
                          <input
                            checked={values.gender === option.value}
                            name="gender"
                            onChange={() => setField("gender", option.value)}
                            type="radio"
                            value={option.value}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.gender ? <p className="ck-error">{errors.gender}</p> : null}
                  </fieldset>
                </div>
              </div>

              <div className="box-ip-checkout">
                <div className="ck-sectionHead">
                  <h2 className="ck-sectionTitle">Shipping address</h2>
                  <p className="ck-sectionNote">
                    Your state determines which licensed clinician can review your intake.
                  </p>
                </div>

                <AddressFields
                  autoCompleteScope="shipping"
                  errors={errors}
                  onChange={setField}
                  prefix=""
                  values={values}
                />

                <label className="ck-toggleRow">
                  <input
                    checked={billingDiffers}
                    className="tf-check"
                    onChange={(event) => setBillingDiffers(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm text-main">My billing address is different</span>
                </label>
              </div>

              {billingDiffers ? (
                <div className="box-ip-checkout">
                  <div className="ck-sectionHead">
                    <h2 className="ck-sectionTitle">Billing address</h2>
                  </div>
                  <AddressFields
                    autoCompleteScope="billing"
                    errors={errors}
                    onChange={setField}
                    prefix="billing"
                    values={values}
                  />
                </div>
              ) : null}

              {collectsOnSite ? (
                <div className="box-ip-checkout">
                  <div className="ck-sectionHead">
                    <h2 className="ck-sectionTitle">Payment</h2>
                    <p className="ck-sectionNote">
                      {paymentUnavailable
                        ? "We can't take card details right now."
                        : "Your card is verified now; you'll complete a short medical intake next."}
                    </p>
                  </div>
                  <PaymentFields onUnavailable={setPaymentUnavailable} ref={paymentRef} />
                </div>
              ) : null}

              <div className="box-ip-checkout">
                <div className="ck-sectionHead">
                  <h2 className="ck-sectionTitle">Stay in touch</h2>
                </div>
                <label className="ck-toggleRow">
                  <input
                    checked={emailConsent}
                    className="tf-check"
                    onChange={(event) => setEmailConsent(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm text-main">
                    Email me order updates and occasional offers
                  </span>
                </label>
                <label className="ck-toggleRow">
                  <input
                    checked={smsConsent}
                    className="tf-check"
                    onChange={(event) => setSmsConsent(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm text-main">
                    Text me order updates (message &amp; data rates may apply)
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="tf-page-cart-sidebar">
              <div className="cart-box order-box">
                <div className="ck-summaryHead">
                  <h2 className="ck-sectionTitle">In your cart</h2>
                  <span className="ck-summaryCount">
                    {summary.count} {summary.count === 1 ? "item" : "items"}
                  </span>
                </div>
                <ul className="list-order-product">
                  {items.map((line) => (
                    <li className="order-item" key={line.id}>
                      <figure className="img-product ck-orderImg">
                        {line.item?.hero_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={line.item?.name || ""}
                            height={72}
                            src={line.item.hero_image_url}
                            width={72}
                          />
                        ) : null}
                        <span className="quantity">{line.quantity}</span>
                      </figure>
                      <div className="content">
                        <div className="info">
                          <p className="name text-sm fw-medium">{line.item?.name}</p>
                          {line.plan ? <span className="variant">{line.plan.name}</span> : null}
                        </div>
                        <span className="price text-sm fw-medium">
                          {line.line_total != null ? money(line.line_total) : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="subtotal text-lg fw-medium d-flex justify-content-between">
                  <span>Subtotal</span>
                  <span className="total-price-order">{money(summary.subtotal)}</span>
                </div>
                {localNotice ? (
                  <p className="ck-localNotice">
                    Online payment is not enabled yet — we&apos;ve saved your details and will be
                    in touch to complete your order.
                  </p>
                ) : null}
                <div className="btn-order">
                  <button
                    className="tf-btn btn-dark2 animate-btn w-100"
                    disabled={submitting || Boolean(paymentUnavailable)}
                    type="submit"
                  >
                    {submitting ? "One moment…" : "Continue to secure checkout"}
                  </button>
                </div>
                <p className="ck-handoffNote text-sm text-main">
                  Next: a short medical intake and secure payment with our licensed telehealth
                  partner.
                </p>
                <CartUpsells title="Complete your protocol" variant="checkout" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
