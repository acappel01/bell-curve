import PageHeader from "@/components/PageHeader";
import SectionRenderer from "@/components/SectionRenderer";
import { getPage } from "@/lib/api";

/**
 * A CMS page's body: its title banner and its sections. One composition for
 * the catch-all route and for the application routes an operator may take
 * over (see `cmsOverride`).
 */
export default function CmsPageView({ page, slug, query = null }) {
  return (
    <>
      <PageHeader banner={page.title_banner} slug={slug} />
      <SectionRenderer sections={page.sections} query={query} />
    </>
  );
}

/**
 * The CMS page that takes over an application route, or null.
 *
 * Application routes (/products, /stacks, /blog) shadow the catch-all, so a
 * CMS page with the same slug could never be reached. Instead the route asks
 * here first: when the operator has built a page with that slug, it renders in
 * place of the code default. That is what lets a listing page be composed in
 * admin from sections (a hero, a `catalog-listing` with its own filter and
 * layout knobs, a closing banner) without a deploy, and lets an install with
 * no such page keep the default it always had.
 */
export async function cmsOverride(slug) {
  try {
    return await getPage(slug);
  } catch {
    return null;
  }
}
