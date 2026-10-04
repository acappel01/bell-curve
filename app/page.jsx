import SectionRenderer from "@/components/SectionRenderer";
import { getPage } from "@/lib/api";

export const revalidate = 300;

export async function generateMetadata() {
  const page = await getPage("home");

  if (!page) {
    return {};
  }

  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description || undefined,
    robots: page.seo?.noindex ? { index: false } : undefined,
  };
}

export default async function HomePage() {
  const page = await getPage("home");

  if (!page) {
    return (
      <div className="placeholder-section">
        <h1>Connected — no content yet</h1>
        <p>
          The backend responded but has no published page with the slug <code>home</code>. Create
          one in the admin panel (Pages → New) and it will render here.
        </p>
      </div>
    );
  }

  return <SectionRenderer sections={page.sections} />;
}
