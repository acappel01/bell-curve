import CmsPageView, { cmsOverride } from "@/components/CmsPageView";
import SectionRenderer from "@/components/SectionRenderer";

export const revalidate = 300;

export async function generateMetadata() {
  const page = await cmsOverride("blog");

  return {
    title: page?.seo?.title || page?.title || "Blog",
    description: page?.seo?.description || undefined,
  };
}

/**
 * Blog index. Composed in admin when a CMS page slugged `blog` exists (a hero,
 * a `blog-listing` section with its layout and filter knobs, anything else);
 * otherwise a default listing, so a fresh install still has a working /blog.
 * Filters live in the URL, passed down as `query`.
 */
export default async function BlogIndexPage({ searchParams }) {
  const query = await searchParams;
  const page = await cmsOverride("blog");

  if (page) {
    return <CmsPageView page={page} slug="blog" query={query} />;
  }

  return (
    <SectionRenderer
      query={query}
      sections={[
        {
          type: "blog-listing",
          origin: "code",
          data: { heading: "Blog", layout: "tiles", filter_style: "chips", per_page: 9 },
        },
      ]}
    />
  );
}
