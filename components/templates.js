import { getConfig } from "@/lib/api";
import BchBlogPost from "@/components/bch/blog/BlogPost";
import BchProductDetail from "@/components/bch/catalog/ProductDetail";
import BchStartHere from "@/components/bch/start/StartHere";

/**
 * Per-template views for the application routes that are not CMS pages
 * (product and bundle pages, blog posts, the start-here flow).
 *
 * The route keeps fetching the data — one payload, one cache tag, whichever
 * template renders it — and asks here which component should. A template
 * without an entry falls back to the route's own default (the Atlas
 * composition), so adding a template is adding a row, never editing a route.
 * Selected by /config `theme.frontend_template`.
 */
const VIEWS = {
  "bell-curve": {
    productDetail: BchProductDetail,
    packageDetail: BchProductDetail,
    blogPost: BchBlogPost,
    startHere: BchStartHere,
  },
};

export async function templateView(name) {
  const config = await getConfig();

  return VIEWS[config?.theme?.frontend_template]?.[name] ?? null;
}
