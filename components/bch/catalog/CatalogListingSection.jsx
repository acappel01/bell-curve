import { apiParamsFromSearch } from "@/components/catalog/query";
import { getCatalogFacets, getCatalogPackages, getCatalogProducts } from "@/lib/api";
import SectionHeader from "../SectionHeader";
import CatalogListing from "./CatalogListing";

/** Filter groups an operator can switch on, in display order. */
const FILTER_GROUPS = ["goal", "category", "price", "availability"];

/**
 * The shop's product or bundle grid as a section (code blueprint proposal
 * `catalog-listing`), so a listing page is composed in admin like any other
 * page and its look is a set of knobs rather than a template:
 *
 *   kind          product | package
 *   layout        grid | rows
 *   columns       2 | 3 | 4 (grid only; phones are always one or two up)
 *   filter_style  sidebar | top | drawer | none
 *   filters[]     goal, category, price, availability — the groups shown
 *   labels        { goal: "Concern", … } chip and group names
 *   show_sort, show_count, show_search
 *   per_page      cards per page (the URL owns the page number)
 *   preset_goal, preset_category  a fixed scope ("Sleep picks")
 *   kind_tabs[]   [{label, url}] — "All products / Bundles & plans"
 *   empty_message, eyebrow, heading, emphasis, lead
 *
 * FILTERABLE ONLY WHERE THE ROUTE PASSES `query`. On the listing routes the
 * filters live in the URL and the server refetches; dropped onto an ordinary
 * page the same section is a fixed collection with no controls (reading the
 * URL there would make every CMS page dynamic). The URL/state logic is
 * `useListingFilters`, shared with the Atlas listing.
 */
export default async function CatalogListingSection({ section, query = null }) {
  const data = section.data ?? {};
  const kind = data.kind === "package" ? "package" : "product";
  const filterable = query !== null && data.filter_style !== "none";

  const params = filterable ? apiParamsFromSearch(query, kind) : {};
  params.per_page = String(Math.min(Math.max(Number(data.per_page) || 9, 1), 50));
  if (data.preset_goal) params.goal = data.preset_goal;
  if (data.preset_category) params.category = data.preset_category;

  const fetchList = kind === "package" ? getCatalogPackages : getCatalogProducts;
  const [listing, facets] = await Promise.all([
    fetchList(params),
    filterable ? getCatalogFacets() : Promise.resolve(null),
  ]);

  // /catalog/facets serves both listings and its `price` block means
  // PRODUCTS; a bundle listing reads the package bounds under the same key.
  const scopedFacets =
    facets && kind === "package" ? { ...facets, price: facets.package_price ?? null } : facets;

  const groups = (Array.isArray(data.filters) && data.filters.length ? data.filters : FILTER_GROUPS)
    .filter((group) => FILTER_GROUPS.includes(group))
    // A preset scope is not a choice the visitor can undo, so its group is not offered.
    .filter((group) => !(group === "goal" && data.preset_goal) && !(group === "category" && data.preset_category));

  return (
    <section className="bch-listing" id={section.anchor || undefined}>
      <div className="bch-container">
        <SectionHeader data={data} size="md" />
        <CatalogListing
          kind={kind}
          items={listing?.data ?? []}
          meta={listing?.meta ?? null}
          facets={scopedFacets}
          filterable={filterable}
          options={{
            layout: data.layout === "rows" ? "rows" : "grid",
            columns: [2, 3, 4].includes(Number(data.columns)) ? Number(data.columns) : 3,
            filterStyle: ["sidebar", "top", "drawer"].includes(data.filter_style) ? data.filter_style : "sidebar",
            groups,
            labels: data.labels ?? {},
            showSort: data.show_sort !== false,
            showCount: data.show_count !== false,
            showSearch: data.show_search === true,
            kindTabs: (data.kind_tabs ?? []).filter((tab) => tab?.label && tab?.url),
            emptyMessage: data.empty_message || "Nothing matches those filters yet.",
          }}
        />
      </div>
    </section>
  );
}
