import Link from "next/link";
import { usingFixtures } from "@/lib/fixtures";
import Picture from "./Picture";

/**
 * "What women are asking now" (flexible type `bch-article-row`): one featured
 * article and up to two compact ones. `posts: [{ title, url, image, published }]`.
 *
 * Client rule: show only published articles, at most three, with exact links;
 * otherwise hide. Unpublished posts are dropped and the whole row disappears
 * when none are left.
 *
 * The one exception is a design proof running on fixtures, where the row is
 * shown with its posts marked as previews so the layout can be approved
 * before the articles exist. That switch is the content source, never the
 * payload, so a live page cannot be talked into showing a draft.
 *
 * Once the backend can resolve blog posts into a section (PRX enhancement:
 * blog resolver op), `posts` will come from the blog instead of being typed in.
 */
export default function ArticleRowSection({ section }) {
  const data = section.data ?? {};
  const preview = usingFixtures();
  const posts = (data.posts ?? [])
    .filter((post) => post?.title && post?.url && (post.published || preview))
    .slice(0, 3);

  if (!posts.length) {
    return null;
  }

  const [featured, ...rest] = posts;
  const draft = (post) =>
    !post.published ? <span className="bch-articles__draft">Preview, hidden until published</span> : null;

  return (
    <section className="bch-articles" id={section.anchor || undefined}>
      <div className="bch-container">
        <div className="bch-articles__head">
          <h2 className="bch-eyebrow">{data.heading}</h2>
          {data.link_label && data.link_url ? (
            <Link href={data.link_url} className="bch-link">
              {data.link_label}
              <span className="bch-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ) : null}
        </div>

        <div className="bch-articles__grid">
          <Link href={featured.url} className="bch-articles__featured">
            <Picture image={featured.image} className="bch-articles__picture" sizes="(min-width: 1024px) 25vw, 50vw" />
            <span className="bch-articles__panel">
              {draft(featured)}
              <span className="bch-display bch-display--md">{featured.title}</span>
              <span className="bch-circle-arrow bch-circle-arrow--light" aria-hidden="true">
                →
              </span>
            </span>
          </Link>

          {rest.length ? (
            <ul className="bch-articles__list">
              {rest.map((post) => (
                <li key={post.url}>
                  <Link href={post.url} className="bch-articles__item">
                    <span>
                      {draft(post)}
                      <span className="bch-display bch-display--sm">{post.title}</span>
                    </span>
                    <span className="bch-circle-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
