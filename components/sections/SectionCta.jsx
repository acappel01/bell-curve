"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { packageHref, productHref } from "@/lib/routes";

/**
 * Shared renderer for the blueprint cta_* field group (cta_label, cta_mode,
 * cta_url, backend-inlined cta_product / cta_package). `link` mode is a
 * plain anchor; `add_to_cart` performs a live cart add — products add as
 * buy-once, packages add their default plan. When no live target was
 * inlined (unpublished item, plan-less package), the CTA degrades to a
 * link to the item's page so it never dead-ends.
 *
 * `icon` is optional trailing content rendered inside the button or anchor —
 * a node, not markup, so a caller that has sanitised SVG passes the element it
 * built rather than a string this component would have to trust.
 */
export default function SectionCta({ data, className = "", icon = null }) {
  const { addItem, busy } = useCart();
  const [error, setError] = useState(null);

  if (!data?.cta_label) {
    return null;
  }

  if (data.cta_mode !== "add_to_cart") {
    return (
      <a className={className} href={data.cta_url || "#"}>
        {data.cta_label}
        {icon}
      </a>
    );
  }

  const product = data.cta_product;
  const pkg = data.cta_package;
  const packagePlanId = pkg
    ? (((pkg.plans ?? []).find((plan) => plan.is_default) ?? (pkg.plans ?? [])[0])?.id ?? null)
    : null;

  if (!product && !(pkg && packagePlanId)) {
    const href = product ? productHref(product.slug) : pkg ? packageHref(pkg.slug) : "#";

    return (
      <a className={className} href={href}>
        {data.cta_label}
        {icon}
      </a>
    );
  }

  const add = () => {
    setError(null);
    const payload = product
      ? { type: "product", id: product.id, planId: null, quantity: 1 }
      : { type: "package", id: pkg.id, planId: packagePlanId, quantity: 1 };

    addItem(payload).catch((e) => setError(e.message));
  };

  return (
    <>
      <button type="button" className={className} onClick={add} disabled={busy}>
        {data.cta_label}
        {icon}
      </button>
      {error ? <p className="section-cta__error">{error}</p> : null}
    </>
  );
}
