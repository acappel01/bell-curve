import Breadcrumb from "@/components/catalog/Breadcrumb";
import CrossSlider from "@/components/catalog/CrossSlider";
import ListingClient from "@/components/catalog/ListingClient";
import { apiParamsFromSearch } from "@/components/catalog/query";
import { redirectRenamedFilter } from "@/lib/slugRedirect";
import { getCatalogFacets, getCatalogPackages, getCatalogProducts } from "@/lib/api";

export const revalidate = 300;

export const metadata = {
  title: "Stacks",
};

/**
 * Catalog package (stack) listing — the theme-reference
 * `app/(products)/stacks` page fed by /api/v1/catalog/packages. Packages
 * carry no classification facets, so only category/availability/price groups
 * apply; cards are the theme's ps-card stack cards.
 *
 * THE PRICE BOUNDS ARE SWAPPED HERE, NOT IN THE WIDGETS. `/catalog/facets`
 * serves both listings and its `price` block has always meant PRODUCTS, so this
 * page hands the filter UI `package_price` under the key it already reads.
 * Doing it in the two client components instead would mean teaching both of
 * them which listing they are on, and getting one right and the other wrong is
 * how the slider came to label a product range while filtering package figures
 * in the first place.
 */
export default async function StacksPage({ searchParams }) {
  const params = await searchParams;
  const [listing, facets, crossSell] = await Promise.all([
    getCatalogPackages(apiParamsFromSearch(params, "package")),
    getCatalogFacets(),
    getCatalogProducts({ per_page: 8 }),
  ]);

  // A renamed category would otherwise render an empty listing under a 200,
  // which is a silent failure on a link somebody already shared.
  if ((listing?.data ?? []).length === 0) {
    await redirectRenamedFilter("/stacks", params, "goal", "health_goal");
    await redirectRenamedFilter("/stacks", params, "category", "catalog_category");
  }

  return (
    <>
      <Breadcrumb
        pageName="Stacks"
        pageTitle="Find Your Protocol"
        backgroundImage="/images/banner/shop-header.jpg"
      />
      <CrossSlider
        title="Explore Products"
        items={crossSell?.data ?? []}
        kind="product"
        ctaHref="/products"
        ctaLabel="View All Products"
      />
      <ListingClient
        kind="package"
        items={listing?.data ?? []}
        meta={listing?.meta ?? null}
        facets={facets ? { ...facets, price: facets.package_price ?? null } : facets}
      />
    </>
  );
}
