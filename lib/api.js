/**
 * Server-side client for the prx-backend REST API (/api/v1).
 *
 * All content reads are public; the optional API_TOKEN (an ApiClient token
 * issued in the backend admin) is attached when present. Responses use the
 * `{ data, meta?, message? }` envelope — helpers below unwrap `data`.
 */

import { fixtureFetch, usingFixtures } from "@/lib/fixtures";

const BASE_URL = process.env.API_BASE_URL;

// Default fetch-cache window (seconds). Set API_REVALIDATE=0 in .env so
// backend content edits show up on the next request during local dev.
const DEFAULT_REVALIDATE = Number(process.env.API_REVALIDATE ?? 300);

/**
 * Low-level fetch against the API. Returns the parsed JSON body.
 *
 * @param {string} path Path under the API base, e.g. "/pages/home"
 * @param {{ revalidate?: number, searchParams?: Record<string, string>, tags?: string[] }} [options]
 * @returns {Promise<any|null>} Parsed body, or null on 404.
 * @throws {Error} On network failure or non-OK, non-404 responses.
 */
export async function apiFetch(path, { revalidate = DEFAULT_REVALIDATE, searchParams, tags, noStore = false } = {}) {
  if (usingFixtures()) {
    return fixtureFetch(path);
  }

  if (!BASE_URL) {
    // NOT .env.local. Next loads that at HIGHER precedence than .env in
    // production as well as dev, so one silently shadows every value in .env —
    // this deployment shipped both once and spent a while on it. `.env` is
    // gitignored, so a fresh clone has NO env file and every content read
    // throws here: 500 on every route, including /favicon.ico, while the
    // browser console shows only a generic error. The real message is in the
    // terminal running the server.
    throw new Error(
      "API_BASE_URL is not set — copy .env.example to .env (NOT .env.local) and set it to the backend's /api/v1 base URL"
    );
  }

  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const headers = { Accept: "application/json" };
  if (process.env.API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
  }

  // Tags let the backend purge this entry the moment an admin saves, instead
  // of waiting out `revalidate`. Every content read carries the broad "cms"
  // tag plus a specific one — see app/api/revalidate/route.js.
  const response = await fetch(url, {
    headers,
    // `noStore` is for the handful of reads that are about ONE PERSON rather
    // than about content. Caching a lead would serve one visitor's plan to
    // another, and tagging it would be meaningless — there is no admin save
    // that should purge it.
    ...(noStore
      ? { cache: "no-store" }
      : { next: { revalidate, ...(tags ? { tags } : {}) } }),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`API ${response.status} for ${path}`);
  }

  return response.json();
}

/** Site config bundle (brand, theme, contact, seo, provider). Null if the API is unreachable. */
export async function getConfig() {
  try {
    const body = await apiFetch("/config", { tags: ["cms", "config"] });
    return body?.data ?? null;
  } catch {
    return null;
  }
}

/** CMS page with section envelopes, or null when no page has that slug. */
export async function getPage(slug) {
  const body = await apiFetch(`/pages/${encodeURIComponent(slug)}`, {
    tags: ["cms", `page:${slug}`],
  });
  return body?.data ?? null;
}

/** The six layout regions (all keys always present). */
export async function getLayout() {
  const body = await apiFetch("/layout", { tags: ["cms", "layout"] });
  return body?.data?.regions ?? null;
}

/** Menu tree by slug, or null when the menu doesn't exist. */
export async function getMenu(slug) {
  const body = await apiFetch(`/menus/${encodeURIComponent(slug)}`, {
    tags: ["cms", `menu:${slug}`],
  });
  return body?.data ?? null;
}

/**
 * Paginated catalog product listing. Returns the full `{ data, links, meta }`
 * envelope (meta drives pagination), or an empty page shape on 404.
 */
export async function getCatalogProducts(searchParams = {}) {
  const body = await apiFetch("/catalog/products", { searchParams, tags: ["cms", "catalog"] });
  return body ?? { data: [], meta: null };
}

/** Paginated catalog package listing — same envelope as products. */
export async function getCatalogPackages(searchParams = {}) {
  const body = await apiFetch("/catalog/packages", { searchParams, tags: ["cms", "catalog"] });
  return body ?? { data: [], meta: null };
}

/** Catalog product detail by slug, or null when no product has that slug. */
export async function getCatalogProduct(slug) {
  const body = await apiFetch(`/catalog/products/${encodeURIComponent(slug)}`, {
    tags: ["cms", "catalog", `product:${slug}`],
  });
  return body?.data ?? null;
}

/**
 * Where a renamed record went, or null if this slug was never one of its names.
 *
 * ONLY EVER CALLED AFTER A LOOKUP HAS ALREADY MISSED. It is the 404 path, not
 * part of a normal render, so it costs a round trip on exactly the requests
 * that were about to fail anyway.
 *
 * TAGGED `cms` ONLY, and that is deliberate rather than lazy. The obvious
 * choice — a `{type}:{slug}` tag for the slug being resolved — does not work:
 * that slug is the OLD one, and a LATER rename emits tags for the names
 * involved in THAT rename, never for a slug abandoned two renames ago. The tag
 * would look precise and purge nothing. `cms` is emitted by every content
 * write, so it is what actually keeps this answer honest. The per-type
 * vocabulary is not uniform either — compounds are tagged `kb:{slug}`, not
 * `kb_compound:{slug}` — which is a second reason not to synthesise one here.
 */
export async function resolveSlugRedirect(type, slug) {
  const body = await apiFetch("/slug-redirect", {
    searchParams: { type, slug },
    tags: ["cms"],
  });

  return body?.data ?? null;
}

/** Catalog package (stack) detail by slug, or null when no package has that slug. */
export async function getCatalogPackage(slug) {
  const body = await apiFetch(`/catalog/packages/${encodeURIComponent(slug)}`, {
    tags: ["cms", "catalog", `package:${slug}`],
  });
  return body?.data ?? null;
}

/**
 * Paginated knowledge-base listing. Same envelope as the catalog listings —
 * `meta` drives pagination.
 *
 * The endpoint returns peptides only unless `peptides_only=0` is passed: the
 * seed library is largely antibiotics, vitamins and topicals, and the default
 * answer to "what is in the knowledge base" is the peptide wiki.
 */
export async function getKbCompounds(searchParams = {}) {
  const body = await apiFetch("/kb/compounds", { searchParams, tags: ["cms", "kb"] });
  return body ?? { data: [], meta: null };
}

/**
 * Knowledge-base monograph by slug, or null when no PUBLISHED compound has
 * that slug.
 *
 * The backend also 404s a monograph with no regulatory status, so null here
 * means "not public", not "does not exist" — which is why the page calls
 * notFound() rather than rendering a placeholder.
 *
 * A clinician reviewer is NOT part of that gate: `reviewed_by` is null on most
 * monographs and the page must render without it.
 */
export async function getKbCompound(slug) {
  const body = await apiFetch(`/kb/compounds/${encodeURIComponent(slug)}`, {
    tags: ["cms", "kb", `kb:${slug}`],
  });
  return body?.data ?? null;
}

/**
 * A lead by its UUID — the visitor's own plan.
 *
 * NEVER CACHED. This is one person's data, and the UUID is a bearer credential
 * rather than a public identifier: only the visitor who submitted the quiz has
 * it, and it arrived in their own redirect. Returns null on 404 so an expired
 * or invented UUID renders a not-found page rather than a 500.
 */
export async function getLead(uuid) {
  const body = await apiFetch(`/leads/${encodeURIComponent(uuid)}`, { noStore: true });
  return body?.data ?? null;
}

/**
 * The protocol that lead was matched to — what `/plan/{uuid}` renders.
 *
 * NEVER CACHED, for both reasons at once: it is one person's data, like the
 * lead itself, and it is recomputed against the live catalogue on every read,
 * so a cached copy would keep recommending a product withdrawn since.
 *
 * Returns the whole envelope rather than just `data`, unlike every other helper
 * here. The `meta` carries the operator's results-page copy and the two facts
 * that decide which of them to show — whether the visitor completed a quiz at
 * all, and whether the eligibility gate had anything to run on. Unwrapping to
 * `data` would drop exactly the half the empty states are built from.
 *
 * Returns null on 404 so an expired or invented UUID renders a not-found page
 * rather than a 500 — matching getLead, since the page calls both.
 */
export async function getLeadPlan(uuid) {
  const body = await apiFetch(`/leads/${encodeURIComponent(uuid)}/plan`, { noStore: true });
  return body?.data ? body : null;
}

/**
 * The intake quiz definition — steps, questions, options and their conditions.
 *
 * Server-side and cached, unlike `lib/quizClient.js`: the questions are content
 * and identical for every visitor. Only the ANSWERS are per-person, and those
 * never come through here.
 *
 * Tagged `quiz`, which the backend also invalidates on plan and package writes
 * — the payload embeds live price ranges, so a price edit can make a cached
 * quiz wrong without the quiz itself being touched.
 *
 * Returns null rather than throwing when no quiz is configured, so a fresh
 * install renders an empty state instead of a 500.
 */
export async function getQuiz(slug) {
  const path = slug ? `/quiz/${encodeURIComponent(slug)}` : "/quiz";
  const body = await apiFetch(path, { tags: ["cms", "quiz"] });
  return body?.data ?? null;
}

/**
 * The intake quiz's goal choices. Unpaginated — the endpoint returns the whole
 * list because a quiz screen shows all of them.
 *
 * Tagged `health-goals` as well as `cms` so the backend's CmsCacheObserver can
 * invalidate goal edits on their own. An untagged helper would go stale for the
 * full ISR window and an operator would see their new goal appear "sometimes".
 */
export async function getHealthGoals() {
  const body = await apiFetch("/health-goals", { tags: ["cms", "health-goals"] });
  return body?.data ?? [];
}

/**
 * Catalog facets (option lists + counts + price bounds) for the listing
 * sidebar. Null when the API is unreachable — the listing renders without
 * filter groups rather than failing the page.
 */
export async function getCatalogFacets() {
  try {
    const body = await apiFetch("/catalog/facets", { tags: ["cms", "catalog"] });
    return body?.data ?? null;
  } catch {
    return null;
  }
}
