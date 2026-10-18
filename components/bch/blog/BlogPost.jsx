import Link from "next/link";
import CtaLink from "../CtaLink";
import SectionRenderer from "@/components/SectionRenderer";
import { cmsOverride } from "@/components/CmsPageView";
import { getBlogPosts } from "@/lib/api";
import { toHtml } from "@/lib/richText";
import { blogCategoryHref } from "@/lib/routes";
import { postMeta } from "./format";
import PostCard from "./PostCard";

/**
 * BCH blog post page.
 *
 * Header (topic, title, standfirst, byline), the hero image, then the article
 * beside a sticky sidebar: "In this article" built from the post's own H2s,
 * and a next-step card. After the article: tags, the sections of the CMS page
 * slugged `blog-post` (the post template, edited in admin like any page, so
 * the education disclaimer and the Health Map banner under every post are
 * content, not code), then more posts from the same topic.
 *
 * `content` is rendered as admin HTML. The admin field is a plain textarea
 * today (PRX enhancement: rich editor), and `toHtml` keeps plain-text bodies
 * readable meanwhile.
 */
export default async function BlogPost({ post }) {
  const category = post.categories?.[0] ?? null;
  const { html, headings } = withHeadingIds(toHtml(post.content) ?? "");

  const [template, sameTopic, latest] = await Promise.all([
    cmsOverride("blog-post"),
    category ? getBlogPosts({ category: category.slug, per_page: "4" }) : Promise.resolve(null),
    getBlogPosts({ per_page: "6" }),
  ]);

  // Same topic first, topped up with the newest posts so the row is full.
  const more = [...(sameTopic?.data ?? []), ...(latest?.data ?? [])]
    .filter((entry, index, list) => entry.slug !== post.slug && list.findIndex((e) => e.slug === entry.slug) === index)
    .slice(0, 3);
  const meta = postMeta(post);

  return (
    <article className="bch-article">
      {/* A div, not <header>: the inherited theme styles every <header> element. */}
      <div className="bch-article__header bch-container">
        <nav className="bch-crumbs" aria-label="Breadcrumb">
          <Link href="/blog">Library</Link>
          {category ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={blogCategoryHref(category.slug)}>{category.name}</Link>
            </>
          ) : null}
        </nav>
        <h1 className="bch-display bch-display--xl bch-article__title">{post.title}</h1>
        {post.excerpt ? <p className="bch-lead bch-article__standfirst">{post.excerpt}</p> : null}
        <p className="bch-article__byline">
          {post.author?.name ? <span>By {post.author.name}</span> : null}
          {meta ? <span>{meta}</span> : null}
        </p>
      </div>

      {post.hero_image_url ? (
        <div className="bch-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bch-article__hero" src={post.hero_image_url} alt="" fetchPriority="high" />
        </div>
      ) : null}

      <div className="bch-container bch-article__layout">
        <div className="bch-article__body rich-text" dangerouslySetInnerHTML={{ __html: html }} />

        <aside className="bch-article__aside">
          {headings.length > 1 ? (
            <nav className="bch-side" aria-label="In this article">
              <p className="bch-eyebrow">In this article</p>
              <ol className="bch-side__toc">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="bch-side bch-side--cta">
            {/* Fixed copy for the proof; a post-template setting once the
                backend has one (PRX enhancement: blog post template). */}
            <p className="bch-display bch-display--sm">Not sure where to start?</p>
            <p>Answer a few questions and we&apos;ll point you to the right next step.</p>
            <CtaLink label="Start here" url="/start-here" />
          </div>
        </aside>
      </div>

      {post.tags?.length ? (
        <div className="bch-container bch-article__tags">
          {post.tags.map((tag) => (
            <Link key={tag.slug} href={`/blog?tag=${encodeURIComponent(tag.slug)}`} className="bch-chip">
              {tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      {template?.sections?.length ? <SectionRenderer sections={template.sections} /> : null}

      {more.length ? (
        <section className="bch-blog bch-blog--more">
          <div className="bch-container">
            <div className="bch-blog__head">
              <div className="bch-head bch-head--left">
                <h2 className="bch-display bch-display--md">Keep reading</h2>
              </div>
            </div>
            <ul className="bch-blog__tiles bch-blog__tiles--cols-3">
              {more.map((entry) => (
                <li key={entry.slug}>
                  <PostCard post={entry} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </article>
  );
}

/**
 * Gives every H2 in the article an id and returns them for the contents list.
 * Admin HTML is the trusted input here (see lib/richText); an H2 that already
 * carries an id keeps it.
 */
function withHeadingIds(html) {
  const headings = [];
  const used = new Set();

  const out = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (match, attrs = "", inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const existing = attrs.match(/\sid="([^"]+)"/)?.[1];
    let id = existing || text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";

    while (!existing && used.has(id)) id = `${id}-x`;
    used.add(id);
    headings.push({ id, text });

    return existing ? match : `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  return { html: out, headings };
}
