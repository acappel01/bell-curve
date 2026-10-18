import { notFound } from "next/navigation";
import { redirectRenamedSlug } from "@/lib/slugRedirect";
import Breadcrumb from "@/components/productDetails/Breadcrumb";
import ConversionTemplate from "@/components/productDetails/ConversionTemplate";
import Details from "@/components/productDetails/Details";
import DescriptionBand from "@/components/productDetails/DescriptionBand";
import RailStack from "@/components/productDetails/RailStack";
import TrustBand from "@/components/productDetails/TrustBand";
import SectionRenderer from "@/components/SectionRenderer";
import { normalizePresentation } from "@/components/productDetails/presentation";
import { getConfig, getCatalogProduct } from "@/lib/api";
import { templateView } from "@/components/templates";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  if (!product) {
    return {};
  }

  return {
    title: product.seo?.meta_title || product.name,
    description: product.seo?.meta_description || product.short_description || undefined,
    openGraph: product.seo?.og_image_url ? { images: [product.seo.og_image_url] } : undefined,
  };
}

/**
 * Catalog product detail, fed by /api/v1/catalog/products/{slug}.
 *
 * THE BENEFITS DIAGRAM IS NOT COMPOSED HERE ANY MORE. It used to render
 * whenever the record had highlights[], which coupled a Merchandising field to
 * a page block: adding one highlight made a large radial section appear, and
 * the only way to remove it was to delete the line, because it was not a
 * section and had no toggle. It is `benefits-diagram` under Page Sections now,
 * added where an operator wants it, and highlights render as the credibility
 * list under the buy box, which is what they were always for. Chrome (header/footer) comes from the root
 * layout; RecentlyViewedProducts is intentionally not ported (needs
 * client-side viewed-history state — out of scope); the V1 FAQs and
 * Reviews blocks await their backend features (polymorphic FAQs, patient
 * portal reviews).
 */
export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  if (!product) {
    // Renaming a product renames its public URL. Before dead-ending, ask
    // whether this slug is one the record used to answer to.
    await redirectRenamedSlug("product", slug);
    notFound();
  }

  const View = await templateView("productDetail");
  if (View) {
    return <View item={product} kind="product" />;
  }

  const pres = normalizePresentation(product.detail_layout);
  // Site-wide, so it is read from /config rather than folded into `pres`,
  // which normalizes this record's own builder knobs. `=== true` fails
  // closed: an unreachable API leaves the gallery zoom-free rather than
  // pulling a library nobody asked for.
  const config = await getConfig();
  const zoomEnabled = config?.theme?.product_zoom_enabled === true;

  if (pres.template === "conversion") {
    return (
      <>
        <Breadcrumb name={product.name} listingHref="/products" listingLabel="Products" />
        <ConversionTemplate item={product} kind="product" pres={pres} zoomEnabled={zoomEnabled} />
      </>
    );
  }

  const tabSections = (product.detail_sections ?? []).filter(
    (section) => section.placement === "tab",
  );

  return (
    <>
      <Breadcrumb name={product.name} listingHref="/products" listingLabel="Products" />
      <Details item={product} kind="product" pres={pres} zoomEnabled={zoomEnabled} />
      <TrustBand />
      <DescriptionBand sections={tabSections} />
      <SectionRenderer sections={product.sections ?? []} item={product} />
      <RailStack related={product.related ?? []} rails={pres.rails} />
    </>
  );
}
