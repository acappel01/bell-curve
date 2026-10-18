import { getConfig } from "@/lib/api";

/**
 * Launch-state actions for the brand's services (care, shop, membership).
 *
 * The client's rule: every Care, Shop and Membership call to action matches
 * the real launch state, and a page never mixes live and waitlist language.
 * So a section names the service it sells (`service: "care"`) instead of
 * hard-coding a button. The button and status line come from /config
 * `services.{key}`:
 *
 *   { state: "live" | "waitlist" | "coming_soon",
 *     actions: { live: { label, url, status? }, waitlist: { ... }, ... } }
 *
 * Flipping one state in admin flips every CTA for that service site-wide.
 */
export function serviceAction(services, key) {
  const service = key ? services?.[key] : null;
  if (!service?.state) {
    return null;
  }

  const action = service.actions?.[service.state];

  return action?.label && action?.url ? { ...action, state: service.state } : null;
}

/**
 * Section data with `primary_cta_*` (and `status`) taken from the service's
 * current action when `data.service` is set. Sections without a service, or a
 * service with no action for its state, keep their authored CTA.
 */
export async function withServiceCta(data) {
  if (!data?.service) {
    return data;
  }

  const config = await getConfig();
  const action = serviceAction(config?.services, data.service);
  if (!action) {
    return data;
  }

  return {
    ...data,
    primary_cta_label: action.label,
    primary_cta_url: action.url,
    status: action.status ?? data.status ?? null,
  };
}
