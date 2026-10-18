/**
 * Fixture answers for the API's filtered, paginated collections.
 *
 * The design proof has to show working filters, sorting and pagination before
 * a backend is installed, so the catalog and blog listings are answered from
 * flat record files using the SAME query params the endpoints accept:
 *
 *   /catalog/products, /catalog/packages — goal, category, tag, search,
 *     price_min, price_max, in_stock, featured, sort, page, per_page
 *   /catalog/facets
 *   /blog/posts — category, tag, featured, search, page, per_page
 *   /blog/categories, /health-goals
 *
 * Fixture-only, and deliberately thin. The backend owns the real semantics;
 * this mirrors the shape of its answers (the `{data, meta}` envelope and the
 * resource keys) closely enough that the components under review are the
 * production components. Nothing here is imported on a live install.
 *
 * Record files live under fixtures/<set>/catalog and fixtures/<set>/blog and
 * are the seeder's input for catalog and blog content as well.
 */

const MAX_PER_PAGE = 50;

/** Routes a collection path to its handler. Null for anything unmapped (a 404). */
export async function queryFixture(apiPath, params, read) {
  const detail = apiPath.match(/^\/catalog\/(products|packages)\/([^/]+)$/);
  if (detail) {
    return catalogDetail(detail[1], decodeURIComponent(detail[2]), read);
  }

  const list = apiPath.match(/^\/catalog\/(products|packages)$/);
  if (list) {
    const records = await recordsOf(read, `catalog/${list[1]}.json`);
    return paginate(sortCatalog(filterCatalog(records, params), params.sort), params);
  }

  if (apiPath === "/catalog/facets") {
    return { data: await catalogFacets(read) };
  }

  if (apiPath === "/health-goals") {
    return { data: await recordsOf(read, "catalog/goals.json") };
  }

  const post = apiPath.match(/^\/blog\/posts\/([^/]+)$/);
  if (post) {
    const posts = await recordsOf(read, "blog/posts.json");
    const found = posts.find((item) => item.slug === decodeURIComponent(post[1]));
    return found ? { data: found } : null;
  }

  if (apiPath === "/blog/posts") {
    const posts = (await recordsOf(read, "blog/posts.json"))
      .filter((item) => matchesBlog(item, params))
      .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
      // The API only sends `content` on the single-post route.
      .map(({ content, ...rest }) => rest);
    return paginate(posts, params);
  }

  if (apiPath === "/blog/categories") {
    return { data: await recordsOf(read, "blog/categories.json") };
  }

  return null;
}

async function recordsOf(read, file) {
  return (await read(file))?.data ?? [];
}

/** `{data, meta}` page of `items`, honouring page / per_page like Laravel's paginator. */
function paginate(items, params) {
  const perPage = Math.min(Math.max(Number(params.per_page) || 15, 1), MAX_PER_PAGE);
  const lastPage = Math.max(Math.ceil(items.length / perPage), 1);
  const page = Math.min(Math.max(Number(params.page) || 1, 1), lastPage);

  return {
    data: items.slice((page - 1) * perPage, page * perPage),
    links: null,
    meta: { current_page: page, last_page: lastPage, per_page: perPage, total: items.length },
  };
}

const hasSlug = (list, slug) => (list ?? []).some((entry) => entry.slug === slug);

/** The figure price filters and sorts compare: the card's own "as low as". */
const cardAmount = (item) => item.price_from?.amount ?? item.price?.effective ?? null;

function filterCatalog(records, params) {
  const search = (params.search ?? "").toLowerCase();
  const min = params.price_min !== undefined ? Number(params.price_min) : null;
  const max = params.price_max !== undefined ? Number(params.price_max) : null;

  return records.filter((item) => {
    if (params.goal && !hasSlug(item.health_goals, params.goal)) return false;
    if (params.category && !hasSlug(item.categories, params.category)) return false;
    if (params.tag && !hasSlug(item.tags, params.tag)) return false;
    if (search && !item.name.toLowerCase().includes(search)) return false;
    if (params.featured === "1" && !item.is_featured) return false;
    if (params.in_stock === "1" && item.is_in_stock === false) return false;
    if (params.in_stock === "0" && item.is_in_stock !== false) return false;

    const amount = cardAmount(item);
    if (min !== null && amount !== null && amount < min) return false;
    if (max !== null && amount !== null && amount > max) return false;

    return true;
  });
}

function sortCatalog(records, sort) {
  const sorted = [...records];
  const by = {
    name: (a, b) => a.name.localeCompare(b.name),
    price: (a, b) => (cardAmount(a) ?? 0) - (cardAmount(b) ?? 0),
  };
  const key = (sort ?? "").replace(/^-/, "");

  if (!by[key]) {
    return sorted.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  sorted.sort(by[key]);
  return sort.startsWith("-") ? sorted.reverse() : sorted;
}

/**
 * Detail record with `related` / `pairs_with` expanded from slug references
 * (`related_refs: [{type, slug}]`) into the API's relation-item shape, so the
 * record files never carry a second copy of a product.
 */
async function catalogDetail(collection, slug, read) {
  const record = (await recordsOf(read, `catalog/${collection}.json`)).find((item) => item.slug === slug);

  if (!record) {
    return null;
  }

  const all = {
    product: await recordsOf(read, "catalog/products.json"),
    package: await recordsOf(read, "catalog/packages.json"),
  };
  const expand = (refs) =>
    (refs ?? [])
      .map((ref) => {
        const item = all[ref.type]?.find((entry) => entry.slug === ref.slug);
        return item ? relationItem(ref.type, item) : null;
      })
      .filter(Boolean);

  const { related_refs, pairs_with_refs, ...data } = record;

  return { data: { ...data, related: expand(related_refs), pairs_with: expand(pairs_with_refs) } };
}

/** CatalogRelationItemResource keys. */
function relationItem(type, item) {
  return {
    type,
    id: item.id,
    name: item.name,
    slug: item.slug,
    subtitle: item.subtitle ?? null,
    short_description: item.short_description ?? null,
    badge_text: item.badge_text ?? null,
    hero_image_url: item.hero_image_url ?? null,
    is_in_stock: item.is_in_stock !== false,
    price: item.price ?? null,
    price_range: item.price_range ?? null,
    price_from: item.price_from ?? null,
    health_goals: item.health_goals ?? [],
  };
}

/** FacetController shape: `{name, slug, count, package_count}` rows plus price bounds. */
async function catalogFacets(read) {
  const products = await recordsOf(read, "catalog/products.json");
  const packages = await recordsOf(read, "catalog/packages.json");

  const rows = (key) => {
    const bySlug = new Map();
    const tally = (items, field) => {
      for (const item of items) {
        for (const entry of item[key] ?? []) {
          const row = bySlug.get(entry.slug) ?? { name: entry.name, slug: entry.slug, count: 0, package_count: 0 };
          row[field] += 1;
          bySlug.set(entry.slug, row);
        }
      }
    };
    tally(products, "count");
    tally(packages, "package_count");
    return [...bySlug.values()];
  };

  const bounds = (items) => {
    const amounts = items.map(cardAmount).filter((amount) => amount !== null);
    return amounts.length
      ? { min: Math.floor(Math.min(...amounts)), max: Math.ceil(Math.max(...amounts)), currency: "USD" }
      : null;
  };

  return {
    goals: rows("health_goals"),
    categories: rows("categories"),
    classes: [],
    types: [],
    forms: [],
    ingredients: [],
    tags: rows("tags"),
    price: bounds(products),
    package_price: bounds(packages),
    availability: {
      in_stock: products.filter((item) => item.is_in_stock !== false).length,
      out_of_stock: products.filter((item) => item.is_in_stock === false).length,
    },
  };
}

function matchesBlog(post, params) {
  const search = (params.search ?? "").toLowerCase();

  if (params.category && !hasSlug(post.categories, params.category)) return false;
  if (params.tag && !hasSlug(post.tags, params.tag)) return false;
  if (params.featured === "1" && !post.featured) return false;
  if (search && !post.title.toLowerCase().includes(search)) return false;

  return true;
}
