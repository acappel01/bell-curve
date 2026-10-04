import IntakeClient from "@/components/intake/IntakeClient";

export const metadata = {
  title: "Clinical intake",
  // The page is reachable only with a lead UUID and shows a specific
  // visitor's intake — it must never be indexed.
  robots: { index: false, follow: false },
};

/**
 * Clinical intake, hosted on this site rather than on the admin domain.
 *
 * The provider's embed is an iframe, so nothing required the host page to be
 * theirs — and hosting it there put the clinical step outside this site's
 * branding and compliance copy, with no way back to the cart and nothing
 * preserved on a back press.
 *
 * A server component only to unwrap the route param: the SDK runs in the
 * browser and needs the payload there, so fetching it server-side would just
 * mean serialising it straight back down.
 */
export default async function IntakePage({ params }) {
  const { uuid } = await params;

  return <IntakeClient uuid={uuid} />;
}
