/**
 * Route patterns for backend menu links.
 *
 * The API emits entity links as `{type, slug}` (slugs resolved at read time,
 * so backend renames propagate automatically) and direct links as
 * `{type: "url"|"anchor", url}`. This app owns how each entity type maps to
 * a URL — the backend never dictates routes.
 */

/**
 * URL prefix for the knowledge base.
 *
 * A deliberate exception to "every design decision lives in admin". The
 * backend owns compound slugs; the prefix they hang under is code's half of
 * the contract, because a route is a filesystem path here and canonicals and
 * the sitemap are generated from it. Were the prefix a database value, the ISR
 * window after an operator changed it would serve pages whose canonical URL
 * and sitemap entries both point at a prefix that 404s — the page telling a
 * crawler to index an address that does not exist.
 *
 * Changing it is a one-line edit plus a rebuild, and needs a 301 from the old
 * prefix. Every KB URL in this app is built from this constant; do not inline
 * "/kb" anywhere else.
 */
export const KB_BASE_PATH = "/kb";


const ENTITY_ROUTES = {
  // `home` is served at the root, not at /home — the catch-all maps "/" to the
  // CMS page slugged `home`, so /home is a second address for the same page.
  // Emitting it would make a redirect target a duplicate URL.
  page: (slug) => (slug === "home" ? "/" : `/${slug}`),
  product: (slug) => `/products/${slug}`,
  package: (slug) => `/stacks/${slug}`,
  catalog_category: (slug) => `/stacks?category=${encodeURIComponent(slug)}`,
  blog_post: (slug) => `/blog/${slug}`,
  blog_category: (slug) => `/blog?category=${encodeURIComponent(slug)}`,
  kb_compound: (slug) => `${KB_BASE_PATH}/${slug}`,
  health_goal: (slug) => `/goals/${slug}`,
};

/**
 * Health-goal index href — the page listing everything tagged with a goal.
 *
 * DESIGNED NOW, BUILT LATER (27a). Badges render as plain spans until the
 * page exists, because an anchor pointing here today falls through to the
 * `app/[...slug]` catch-all and 404s. This is the one seam to change when it
 * lands; do not inline "/goals/" anywhere else.
 *
 * `/goals` rather than a `?goal=` param on a listing: a badge sits on both
 * products and packages and needs ONE href to a mixed index, and `/stacks`
 * already spends its query-param slot on `catalog_category` — two different
 * vocabularies sharing one param is a collision waiting to happen.
 *
 * Adding `app/goals/` shadows any CMS page slugged "goals", the same accepted
 * trade `/products`, `/stacks` and `/kb` already make.
 */
export function goalHref(slug) {
  return slug ? ENTITY_ROUTES.health_goal(slug) : "#";
}

/** Catalog product detail href. */
export function productHref(slug) {
  return slug ? ENTITY_ROUTES.product(slug) : "#";
}

/** Catalog package (stack) detail href. */
export function packageHref(slug) {
  return slug ? ENTITY_ROUTES.package(slug) : "#";
}

/** Catalog category listing href. */
export function categoryHref(slug) {
  return slug ? ENTITY_ROUTES.catalog_category(slug) : "#";
}

/** Blog post href. */
export function blogPostHref(slug) {
  return slug ? ENTITY_ROUTES.blog_post(slug) : "#";
}

/** Blog index href, optionally filtered to one category. */
export function blogCategoryHref(slug) {
  return slug ? ENTITY_ROUTES.blog_category(slug) : "/blog";
}

/** Knowledge-base monograph href. */
export function compoundHref(slug) {
  return slug ? ENTITY_ROUTES.kb_compound(slug) : "#";
}

/** Knowledge-base index href. */
export function kbIndexHref() {
  return KB_BASE_PATH;
}

/**
 * href for a backend `{type, slug}` pair, or null when this app has no route
 * for that type.
 *
 * The same mapping `menuLinkHref` uses, exposed for the slug-redirect path:
 * the backend answers a renamed URL with the entity and its CURRENT slug and
 * deliberately never a path, because URL structure is this app's half of the
 * contract. Returning null rather than "#" is the point here — a redirect
 * target that cannot be built must fall through to a 404, not bounce the
 * visitor to the current page.
 */
export function entityHref(type, slug) {
  const route = ENTITY_ROUTES[type];

  return route && slug ? route(slug) : null;
}

/** Resolve a menu item's `link` object to an href for this app. */
export function menuLinkHref(link) {
  if (!link) {
    return "#";
  }

  if (link.type === "url" || link.type === "anchor") {
    return link.url || "#";
  }

  const route = ENTITY_ROUTES[link.type];
  return route ? route(link.slug) : "#";
}
