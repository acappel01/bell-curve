import { notFound } from "next/navigation";
import { redirectRenamedSlug } from "@/lib/slugRedirect";
import CmsPageView from "@/components/CmsPageView";
import { getPage } from "@/lib/api";

export const revalidate = 300;

/** Joins the catch-all segments back into a CMS slug ("about-us", "legal/privacy"). */
function slugFromParams(params) {
  return params.slug.join("/");
}

export async function generateMetadata({ params }) {
  const page = await getPage(slugFromParams(await params));

  if (!page) {
    return {};
  }

  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description || undefined,
    robots: page.seo?.noindex ? { index: false } : undefined,
  };
}

export default async function CmsPage({ params }) {
  const slug = slugFromParams(await params);
  const page = await getPage(slug);

  if (!page) {
    await redirectRenamedSlug("page", slug);
    notFound();
  }

  // No `query`: reading searchParams would make every CMS page dynamic. A
  // listing section placed on an ordinary page renders as a fixed collection
  // (its preset filters, no filter controls); the filterable listings are the
  // application routes and the CMS pages that take them over.
  return <CmsPageView page={page} slug={slug} />;
}
