import { notFound } from "next/navigation";
import Html from "@/components/Html";
import { templateView } from "@/components/templates";
import { getBlogPost } from "@/lib/api";
import { redirectRenamedSlug } from "@/lib/slugRedirect";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.seo?.meta_title || post.title,
    description: post.seo?.meta_description || post.excerpt || undefined,
    openGraph: post.seo?.og_image_url || post.hero_image_url
      ? { images: [post.seo?.og_image_url || post.hero_image_url] }
      : undefined,
  };
}

/**
 * Blog post, fed by /api/v1/blog/posts/{slug}. The template's own view renders
 * it when there is one (see components/templates.js); otherwise a plain
 * article, so every template has a working post page.
 */
export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    await redirectRenamedSlug("blog_post", slug);
    notFound();
  }

  const View = await templateView("blogPost");
  if (View) {
    return <View post={post} />;
  }

  return (
    <article className="container" style={{ maxWidth: 760, paddingBlock: 48 }}>
      <h1>{post.title}</h1>
      {post.excerpt ? <p className="text-md">{post.excerpt}</p> : null}
      <Html value={post.content} />
    </article>
  );
}
