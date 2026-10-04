/**
 * URL ⇄ API mapping for the knowledge-base index.
 *
 * Same discipline as the catalog listings: filter state lives entirely in the
 * page URL, so a filtered view is a shareable, server-rendered address and
 * there is no client-side refetching. Separate from `components/catalog/query.js`
 * on purpose — that file is hardwired to catalog facet names, and sharing it
 * would mean teaching it about a listing that has no price, stock or category.
 */

export const PER_PAGE = 24;

/** Sort values the API understands. Anything else is dropped, not passed on. */
export const SORT_OPTIONS = [
  { label: "A – Z", value: "name" },
  { label: "Z – A", value: "-name" },
  { label: "Recently published", value: "newest" },
];

/**
 * Regulatory statuses, mirrored from the backend enum for the filter control.
 *
 * A duplicated vocabulary, and worth naming as one: the labels a visitor reads
 * come from the API payload (`regulatory.label`) so they can never drift, but
 * the *filter* has to offer options before any row is loaded. If the backend
 * gains a status, this list needs the same entry — the symptom is a status
 * that appears on cards but cannot be filtered for.
 */
export const REGULATORY_OPTIONS = [
  { label: "FDA approved", value: "fda_approved" },
  { label: "Investigational", value: "investigational" },
  { label: "Research use only", value: "research_only" },
  { label: "Compounded", value: "compounded" },
  { label: "Dietary supplement", value: "supplement" },
  { label: "Marketed without FDA approval", value: "unapproved" },
];

/**
 * Translate the page's `searchParams` into API query params.
 *
 * `peptides_only` is only ever SENT when the visitor turned it off. The API
 * defaults it on, so sending `1` would be noise, and omitting it entirely on
 * the default view keeps the fetch — and therefore the cache key — identical
 * for everyone who has not touched the control.
 *
 * @param {Record<string, string|string[]|undefined>} searchParams
 * @returns {Record<string, string>}
 */
export function apiParamsFromSearch(searchParams) {
  const single = (key) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const params = { per_page: String(PER_PAGE) };

  const search = single("search");
  if (search) {
    params.search = search;
  }

  const status = single("status");
  if (status && REGULATORY_OPTIONS.some((option) => option.value === status)) {
    params.regulatory_status = status;
  }

  if (single("all") === "1") {
    params.peptides_only = "0";
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

/**
 * Rewrites one key of a searchParams object, returning a query string.
 *
 * Changing any filter resets `page` — otherwise a visitor on page 4 who
 * narrows the results lands on a page that no longer exists and sees an empty
 * list that reads as "no matches".
 */
export function withParam(searchParams, key, value) {
  const next = new URLSearchParams();

  for (const [existingKey, existingValue] of Object.entries(searchParams ?? {})) {
    const single = Array.isArray(existingValue) ? existingValue[0] : existingValue;
    if (single !== undefined && single !== "") {
      next.set(existingKey, single);
    }
  }

  if (value === undefined || value === null || value === "") {
    next.delete(key);
  } else {
    next.set(key, String(value));
  }

  if (key !== "page") {
    next.delete("page");
  }

  const query = next.toString();
  return query ? `?${query}` : "";
}
