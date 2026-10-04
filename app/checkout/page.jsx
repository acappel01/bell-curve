import CheckoutClient from "@/components/checkout/CheckoutClient";
import { getConfig } from "@/lib/api";

export const revalidate = 300;

export const metadata = {
  title: "Checkout",
};

/**
 * Checkout — lead capture + order review. The backend's configured
 * checkout path decides what happens on submit:
 *
 *   prx   — the lead is created, then the browser continues to this app's
 *           own /checkout/intake/{uuid}, which hosts the provider's embed.
 *           It used to redirect to a page on the admin domain; that put the
 *           clinical step outside this site's branding and compliance copy,
 *           with no route back to the cart. This app owns its URLs.
 *   local — payment is collected on this page via the gateway SDK
 *           (not yet implemented; embed-first build).
 */
export default async function CheckoutPage() {
  const config = await getConfig();
  const checkout = config?.checkout ?? { path: "prx", upsells: { enabled: true, limit: 4 } };

  return <CheckoutClient checkout={checkout} />;
}
