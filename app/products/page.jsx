import Breadcrumb from "@/components/catalog/Breadcrumb";
import CrossSlider from "@/components/catalog/CrossSlider";
import ListingClient from "@/components/catalog/ListingClient";
import { apiParamsFromSearch } from "@/components/catalog/query";
import { redirectRenamedFilter } from "@/lib/slugRedirect";
import CmsPageView, { cmsOverride } from "@/components/CmsPageView";
import { getCatalogFacets, getCatalogPackages, getCatalogProducts } from "@/lib/api";

export const revalidate = 300;

export async function generateMetadata() {
  const page = await cmsOverride("products");

  return {
    title: page?.seo?.title || page?.title || "Products",
    description: page?.seo?.description || undefined,
  };
}

/**
 * Catalog product listing — application route (not a CMS page), a port of
 * the theme-reference stacks listing composition fed by
 * /api/v1/catalog/products. Filter/sort/page state arrives as searchParams,
 * so filtered views are shareable URLs rendered on the server.
 */
export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;

  // An operator-built page with this slug takes the route over (see
  // cmsOverride): the Bell Curve shop is composed that way, from a hero and a
  // `catalog-listing` section. Without one, the default listing below renders.
  const page = await cmsOverride("products");
  if (page) {
    return <CmsPageView page={page} slug="products" query={params} />;
  }

  const [listing, facets, crossSell] = await Promise.all([
    getCatalogProducts(apiParamsFromSearch(params, "product")),
    getCatalogFacets(),
    getCatalogPackages({ per_page: 8 }),
  ]);

  // A renamed category would otherwise render an empty listing under a 200,
  // which is a silent failure on a link somebody already shared.
  if ((listing?.data ?? []).length === 0) {
    await redirectRenamedFilter("/products", params, "goal", "health_goal");
    await redirectRenamedFilter("/products", params, "category", "catalog_category");
  }

  return (
    <>
      <Breadcrumb
        pageName="Products"
        pageTitle="Products"
        backgroundImage="/images/banner/shop-header.jpg"
      />
      <CrossSlider
        title="Explore Stacks"
        items={crossSell?.data ?? []}
        kind="package"
        ctaHref="/stacks"
        ctaLabel="View All Stacks"
      />
      <ListingClient
        kind="product"
        items={listing?.data ?? []}
        meta={listing?.meta ?? null}
        facets={facets}
      />
    </>
  );
}
