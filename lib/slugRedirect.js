import { permanentRedirect } from "next/navigation";
import { resolveSlugRedirect } from "@/lib/api";
import { entityHref } from "@/lib/routes";

/**
 * Send a renamed URL to wherever the record lives now, or fall through so the
 * caller can 404.
 *
 * Call it immediately before `notFound()` in any route that resolves a record
 * by slug. Renaming a slug is renaming a public URL: every link, bookmark, ad
 * and indexed result pointing at the old name breaks, and nothing on this side
 * can help on its own, because this app keeps no registry of valid slugs — it
 * asks the API and 404s on a miss. The backend remembers former names; this
 * turns that memory into a redirect.
 *
 *   const product = await getCatalogProduct(slug);
 *   if (!product) {
 *     await redirectRenamedSlug("product", slug);
 *     notFound();
 *   }
 *
 * PERMANENT, DELIBERATELY. A 308 tells crawlers and browsers to replace the
 * old address, which is the whole point — a temporary redirect would leave the
 * old URL in every index indefinitely. It also means a mistake is expensive to
 * unwind, which is why the backend refuses to answer when anything live still
 * holds the slug: a live record must always serve its own page.
 *
 * A FAILED LOOKUP IS NOT AN ERROR. A redirect is a nicety on a request that
 * was already going to 404; if the API is unreachable the visitor should get
 * the 404 they were always getting, not a 500.
 *
 * `permanentRedirect` works by THROWING a control signal, so it sits OUTSIDE
 * the try block on purpose. Move it inside and the catch swallows the signal,
 * turning every successful redirect into a silent 404 — which is the single
 * easiest way to break this file.
 */
export async function redirectRenamedSlug(type, slug) {
  let target = null;

  try {
    const resolved = await resolveSlugRedirect(type, slug);
    target = resolved ? entityHref(resolved.type, resolved.slug) : null;
  } catch {
    // Unreachable API, or a malformed answer. Fall through to the caller's
    // notFound() — the outcome the visitor would have had anyway.
    return;
  }

  if (target) {
    permanentRedirect(target);
  }
}

/**
 * The same rescue for a slug that lives in a QUERY PARAM rather than the path.
 *
 * A renamed category is worse than a renamed product, not better: `/stacks` is
 * a real page, so `?category=old-name` returns 200 with an empty listing and no
 * signal that anything is wrong. A shared link silently shows nothing rather
 * than dead-ending honestly, and nobody reports it.
 *
 * TRIGGERED BY AN EMPTY RESULT, NOT BY VALIDATING THE FILTER. There is no cheap
 * way to know a category slug is unknown — `/catalog/facets` returns an empty
 * `categories` array on installs that have not populated it, so "not in the
 * facet list" would misfire on every category. An empty listing WITH a filter
 * set is already a dead end, so spending a round trip there costs nothing on
 * the happy path — which is the same rule the path-based version follows.
 *
 * A legitimately empty category resolves to nothing and renders its empty
 * state, because the backend refuses to answer while any live record holds the
 * slug. That safety property is what makes an empty result safe to act on.
 */
export async function redirectRenamedFilter(pathname, searchParams, key, type) {
  const raw = searchParams?.[key];
  const slug = Array.isArray(raw) ? raw[0] : raw;

  if (!slug) {
    return;
  }

  let target = null;

  try {
    const resolved = await resolveSlugRedirect(type, slug);
    target = resolved?.slug && resolved.slug !== slug ? resolved.slug : null;
  } catch {
    return;
  }

  if (!target) {
    return;
  }

  // Rebuild the whole query string rather than swapping one value, so every
  // other filter, the sort and the page number survive the redirect. Losing
  // them would send someone who shared a filtered view to a different one.
  const next = new URLSearchParams();
  for (const [name, value] of Object.entries(searchParams ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        next.append(name, name === key ? target : item);
      }
    }
  }

  permanentRedirect(`${pathname}?${next.toString()}`);
}
