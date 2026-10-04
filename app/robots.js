import { getConfig } from "@/lib/api";
import { siteUrl } from "@/lib/seo";

export const revalidate = 300;

/**
 * robots.txt — added with the knowledge base, alongside the first sitemap.
 *
 * `allow_indexing` is a single admin switch, and it has to reach the crawler
 * through more than the page metadata it currently controls. When it is off,
 * this disallows everything AND the sitemap returns nothing, so the two agree.
 * When it is on, the only thing blocked is `/api/`, which is this app's own
 * revalidation webhook rather than content.
 */
export default async function robots() {
  const config = await getConfig();
  const base = siteUrl();

  // Fails OPEN when the API is unreachable — `getConfig()` returns null and
  // this check does not fire. That is the opposite polarity from
  // /api/revalidate, which fails closed, and the difference is deliberate:
  // an unset secret there costs nothing, whereas a transient API blip here
  // would serve "Disallow: /" to a live site, and Google acts on that signal
  // far faster than it recovers from it. The exposure is the mirror case — a
  // staging install with indexing off, briefly crawlable — which is bounded by
  // the 300s ISR window and is the cheaper of the two mistakes.
  if (config?.seo?.allow_indexing === false) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    // Omitted rather than guessed when SITE_URL is unset — pointing a crawler
    // at a sitemap on the wrong origin is worse than pointing it at none.
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
