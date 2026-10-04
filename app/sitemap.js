import { apiFetch, getConfig, getKbCompounds } from "@/lib/api";
import { KB_BASE_PATH } from "@/lib/routes";
import { siteUrl } from "@/lib/seo";

export const revalidate = 300;

/** The API caps `per_page` at 100; the KB will outgrow one page. */
const KB_PAGE_SIZE = 100;

/** Stop condition for every paging loop — a backstop, not an expected limit. */
const MAX_PAGES = 20;

/**
 * The site's first sitemap, added with the knowledge base.
 *
 * Scope is every public content route this app owns: CMS pages, catalog
 * products and stacks, and KB monographs. Listing a sitemap that contained
 * only `/kb/*` would tell a crawler the knowledge base is the site, which is
 * exactly backwards for a store that also happens to publish an encyclopaedia.
 *
 * Two deliberate refusals:
 *
 * - **No entry without `SITE_URL`.** Sitemap URLs must be absolute, and a
 *   guessed origin would advertise the wrong host to every crawler that reads
 *   it. Unset means an empty sitemap, which is honest.
 * - **Nothing here when the install says don't index.** `allow_indexing` is a
 *   global switch in the admin; a sitemap that kept publishing URLs while
 *   robots said no would be the two halves contradicting each other. Like
 *   `robots.js`, that check fails OPEN when the API is unreachable — see the
 *   note there for why that polarity is the cheaper mistake.
 *
 * Failures degrade rather than 500: a section the API cannot serve is omitted.
 * A sitemap missing a section costs some crawl efficiency; a sitemap route
 * that throws costs the whole file.
 */
export default async function sitemap() {
  const base = siteUrl();

  if (!base) {
    return [];
  }

  const config = await getConfig();

  if (config?.seo?.allow_indexing === false) {
    return [];
  }

  const [pages, products, packages, compounds] = await Promise.all([
    safely(() => cmsPages()),
    safely(() => catalogSlugs("/catalog/products")),
    safely(() => catalogSlugs("/catalog/packages")),
    safely(() => kbCompounds()),
  ]);

  const entries = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}${KB_BASE_PATH}`, changeFrequency: "weekly", priority: 0.8 },
  ];

  for (const page of pages) {
    // `home` is the site root, already listed above — emitting `/home` as well
    // would be two URLs for one page, which is the duplicate-content problem a
    // canonical exists to avoid.
    if (page.slug && page.slug !== "home" && !page.seo?.noindex) {
      entries.push({ url: `${base}/${page.slug}`, changeFrequency: "monthly", priority: 0.6 });
    }
  }

  for (const slug of products) {
    entries.push({ url: `${base}/products/${slug}`, changeFrequency: "weekly", priority: 0.7 });
  }

  for (const slug of packages) {
    entries.push({ url: `${base}/stacks/${slug}`, changeFrequency: "weekly", priority: 0.7 });
  }

  for (const compound of compounds) {
    entries.push({
      url: `${base}${KB_BASE_PATH}/${compound.slug}`,
      // Monographs carry a real modification date; nothing else here does.
      ...(compound.updated_at ? { lastModified: new Date(compound.updated_at) } : {}),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}

/** Runs a section's fetch, returning an empty list rather than failing the file. */
async function safely(load) {
  try {
    return await load();
  } catch {
    return [];
  }
}

/** All published CMS pages. This endpoint is unpaginated by design. */
async function cmsPages() {
  const body = await apiFetch("/pages", { tags: ["cms"] });
  return body?.data ?? [];
}

/** Slugs from a paginated catalog listing. */
async function catalogSlugs(path) {
  const slugs = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await apiFetch(path, {
      searchParams: { per_page: "50", page: String(page) },
      tags: ["cms", "catalog"],
    });

    const items = body?.data ?? [];
    slugs.push(...items.map((item) => item.slug).filter(Boolean));

    if (page >= (body?.meta?.last_page ?? 1)) {
      break;
    }
  }

  return slugs;
}

/**
 * Every published monograph, peptides and non-peptides alike.
 *
 * `peptides_only: "0"` matters here: the API defaults it on, and a sitemap
 * that inherited that default would silently omit every published non-peptide
 * page — real URLs, not listed, with no error anywhere to notice it by.
 */
async function kbCompounds() {
  const compounds = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await getKbCompounds({
      per_page: String(KB_PAGE_SIZE),
      page: String(page),
      peptides_only: "0",
    });

    compounds.push(...(body?.data ?? []));

    if (page >= (body?.meta?.last_page ?? 1)) {
      break;
    }
  }

  return compounds;
}
