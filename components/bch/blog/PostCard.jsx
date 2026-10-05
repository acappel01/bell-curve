import Link from "next/link";
import { blogCategoryHref, blogPostHref } from "@/lib/routes";
import { postMeta } from "./format";

/**
 * A blog post in a listing. `variant`: "tile" (image over copy), "row" (image
 * beside copy) or "feature" (the large lead story). The options mirror the
 * `blog-listing` knobs, so what a card shows is an admin choice.
 */
export default function PostCard({
  post,
  variant = "tile",
  showExcerpt = true,
  showMeta = true,
  showCategory = true,
  headingLevel = 3,
}) {
  const href = blogPostHref(post.slug);
  const category = post.categories?.[0] ?? null;
  const Title = `h${headingLevel}`;
  const meta = showMeta ? postMeta(post) : "";

  return (
    <article className={`bch-post bch-post--${variant}`}>
      <Link href={href} className="bch-post__media" tabIndex={-1} aria-hidden="true">
        {post.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.hero_image_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="bch-post__placeholder" />
        )}
      </Link>
      <div className="bch-post__body">
        {showCategory && category ? (
          <Link href={blogCategoryHref(category.slug)} className="bch-post__category">
            {category.name}
          </Link>
        ) : null}
        <Title className="bch-post__title">
          <Link href={href}>{post.title}</Link>
        </Title>
        {showExcerpt && post.excerpt ? <p className="bch-post__excerpt">{post.excerpt}</p> : null}
        {meta ? <p className="bch-post__meta">{meta}</p> : null}
      </div>
    </article>
  );
}
