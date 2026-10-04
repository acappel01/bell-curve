/**
 * URL ⇄ API mapping for the catalog listing pages (/products, /stacks).
 *
 * Filter state lives entirely in the page URL so listings are shareable and
 * server-rendered: the server component reads `searchParams`, translates them
 * with `apiParamsFromSearch`, and fetches; client filter widgets rewrite the
 * URL (router.replace) which re-renders the server component with the new
 * params. No client-side refetching.
 */

/**
 * Cards per listing page. Deliberately a server concern and a single constant:
 * filter/sort/page state lives in the URL, so page size may not vary by viewport
 * (a UA-sniffed size would make the same URL yield different pages).
 */
export const PER_PAGE = 8;

/** Theme sort dropdown labels → API `sort` values ("" = position default). */
export const SORT_OPTIONS = [
  { label: "Sort by (Default)", value: "" },
  { label: "Title Ascending", value: "name" },
  { label: "Title Descending", value: "-name" },
  { label: "Price Ascending", value: "price" },
  { label: "Price Descending", value: "-price" },
];

/**
 * Facet filters that hold a single slug, shared by both listing kinds.
 *
 * `goal` leads because it is the classification the catalog is actually
 * populated with — health goals are on every published product and are the
 * same vocabulary the quiz matches on, whereas categories are a merchandising
 * axis an operator fills in per install.
 */
const SLUG_FILTERS = ["goal", "category", "tag"];

/** Product-only classification filters (packages have no classification). */
const PRODUCT_SLUG_FILTERS = ["class", "type", "form", "ingredient"];

/** All URL params the listing understands, in canonical order. */
export function slugFilterKeys(kind) {
  return kind === "product" ? [...SLUG_FILTERS, ...PRODUCT_SLUG_FILTERS] : [...SLUG_FILTERS];
}

/**
 * Translate the page's `searchParams` object into API query params.
 *
 * @param {Record<string, string|string[]|undefined>} searchParams
 * @param {"product"|"package"} kind
 * @returns {Record<string, string>}
 */
export function apiParamsFromSearch(searchParams, kind) {
  const single = (key) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const params = { per_page: String(PER_PAGE) };

  for (const key of slugFilterKeys(kind)) {
    const value = single(key);
    if (value) {
      params[key] = value;
    }
  }

  for (const key of ["search", "price_min", "price_max", "in_stock", "featured"]) {
    const value = single(key);
    if (value !== undefined && value !== "") {
      params[key] = value;
    }
  }

  const sort = single("sort");
  if (sort && SORT_OPTIONS.some((option) => option.value === sort)) {
    params.sort = sort;
  }

  const page = Number(single("page"));
  if (Number.isInteger(page) && page > 1) {
    params.page = String(page);
  }

  return params;
}

/** Label for the current `sort` param, for the theme sort dropdown button. */
export function sortLabel(sortValue) {
  return (
    SORT_OPTIONS.find((option) => option.value === (sortValue || ""))?.label ??
    SORT_OPTIONS[0].label
  );
}
