import { notFound } from "next/navigation";
import { redirectRenamedSlug } from "@/lib/slugRedirect";
import Breadcrumb from "@/components/productDetails/Breadcrumb";
import ConversionTemplate from "@/components/productDetails/ConversionTemplate";
import Details from "@/components/productDetails/Details";
import DescriptionBand from "@/components/productDetails/DescriptionBand";
import RailStack from "@/components/productDetails/RailStack";
import SectionRenderer from "@/components/SectionRenderer";
import { normalizePresentation } from "@/components/productDetails/presentation";
import { getConfig, getCatalogPackage } from "@/lib/api";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const pkg = await getCatalogPackage(slug);

  if (!pkg) {
    return {};
  }

  return {
    title: pkg.seo?.meta_title || pkg.name,
    description: pkg.seo?.meta_description || pkg.short_description || undefined,
    openGraph: pkg.seo?.og_image_url ? { images: [pkg.seo.og_image_url] } : undefined,
  };
}

/**
 * Catalog package (stack) detail — same theme stack-detail composition as
 * the product page, plus the package-only pieces: the pd-deal plan grid
 * (plans[]) and the included-products accordion (products[]). Fed by
 * /api/v1/catalog/packages/{slug}; chrome comes from the root layout.
 * RecentlyViewedProducts is intentionally not ported (needs client-side
 * viewed-history state — out of scope).
 */
export default async function StackDetailPage({ params }) {
  const { slug } = await params;
  const pkg = await getCatalogPackage(slug);

  if (!pkg) {
    await redirectRenamedSlug("package", slug);
    notFound();
  }

  const pres = normalizePresentation(pkg.detail_layout);
  // See the product route: site-wide setting, fails closed to off.
  const config = await getConfig();
  const zoomEnabled = config?.theme?.product_zoom_enabled === true;

  if (pres.template === "conversion") {
    return (
      <>
        <Breadcrumb name={pkg.name} listingHref="/stacks" listingLabel="Stacks" />
        <ConversionTemplate item={pkg} kind="package" pres={pres} zoomEnabled={zoomEnabled} />
      </>
    );
  }

  const tabSections = (pkg.detail_sections ?? []).filter(
    (section) => section.placement === "tab",
  );

  return (
    <>
      <Breadcrumb name={pkg.name} listingHref="/stacks" listingLabel="Stacks" />
      <Details item={pkg} kind="package" pres={pres} zoomEnabled={zoomEnabled} />
      <DescriptionBand sections={tabSections} />
      <SectionRenderer sections={pkg.sections ?? []} item={pkg} />
      <RailStack related={pkg.related ?? []} rails={pres.rails} />
    </>
  );
}
