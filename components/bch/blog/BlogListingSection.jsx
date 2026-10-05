import Link from "next/link";
import CtaLink from "../CtaLink";
import SectionHeader from "../SectionHeader";
import { getBlogCategories, getBlogPosts } from "@/lib/api";
import PostCard from "./PostCard";

const LAYOUTS = ["tiles", "rows", "magazine"];
const SIDEBAR_BLOCKS = ["search", "categories", "featured", "cta"];

/**
 * Blog posts as a section (code blueprint proposal `blog-listing`). Knobs:
 *
 *   layout          tiles | rows | magazine (a large lead story, then tiles)
 *   columns         2 | 3 (tiles and the magazine grid)
 *   filter_style    chips | sidebar | none
 *   sidebar_blocks[] search, categories, featured, cta (sidebar style only)
 *   sidebar_cta_heading / _body / _label / _url
 *   per_page, preset_category, featured_only
 *   show_excerpt, show_meta, show_category
 *   link_label, link_url  ("View all", for a fixed collection)
 *   base_path       where filter links point (default /blog)
 *   eyebrow, heading, emphasis, lead
 *
 * Like `catalog-listing`, it filters only where the route passes `query`
 * (/blog and the CMS page that takes it over). Placed on any other page it is
 * a fixed collection: newest posts, or a preset category, with a link out.
 *
 * Filters are plain links and a GET search form, so the whole listing works
 * without JavaScript and every filtered view is a shareable URL.
 */
export default async function BlogListingSection({ section, query = null }) {
  const data = section.data ?? {};
  const filterable = query !== null;
  const single = (key) => {
    const value = query?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const layout = LAYOUTS.includes(data.layout) ? data.layout : "tiles";
  const filterStyle = filterable && ["chips", "sidebar"].includes(data.filter_style) ? data.filter_style : "none";
  const active = { category: data.preset_category || single("category") || "", search: single("search") || "" };

  const params = { per_page: String(Math.min(Math.max(Number(data.per_page) || 9, 1), 50)) };
  if (active.category) params.category = active.category;
  if (filterable && active.search) params.search = active.search;
  if (filterable && Number(single("page")) > 1) params.page = String(Number(single("page")));
  if (data.featured_only) params.featured = "1";

  const blocks = (data.sidebar_blocks?.length ? data.sidebar_blocks : SIDEBAR_BLOCKS).filter((block) =>
    SIDEBAR_BLOCKS.includes(block),
  );
  const needsCategories = filterStyle === "chips" || (filterStyle === "sidebar" && blocks.includes("categories"));
  const needsFeatured = filterStyle === "sidebar" && blocks.includes("featured");

  const [listing, categories, featured] = await Promise.all([
    getBlogPosts(params),
    needsCategories ? getBlogCategories() : Promise.resolve([]),
    needsFeatured ? getBlogPosts({ featured: "1", per_page: "3" }) : Promise.resolve(null),
  ]);

  const posts = listing?.data ?? [];
  const visibleCategories = categories.filter((category) => category.is_visible !== false);
  const card = {
    showExcerpt: data.show_excerpt !== false,
    showMeta: data.show_meta !== false,
    showCategory: data.show_category !== false,
  };
  const columns = Number(data.columns) === 2 ? 2 : 3;
  const basePath = data.base_path || "/blog";

  /** Query-string href for a filter change; resets the page. */
  const hrefWith = (changes) => {
    const next = new URLSearchParams();
    const merged = { category: active.category, search: active.search, ...changes };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "category" && data.preset_category)) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const chips =
    filterStyle === "chips" && visibleCategories.length && !data.preset_category ? (
      <nav className="bch-blog__chips" aria-label="Topics">
        <Link href={hrefWith({ category: "" })} className="bch-chip" aria-current={!active.category ? "page" : undefined}>
          All
        </Link>
        {visibleCategories.map((category) => (
          <Link
            key={category.slug}
            href={hrefWith({ category: category.slug })}
            className="bch-chip"
            aria-current={active.category === category.slug ? "page" : undefined}
          >
            {category.name}
          </Link>
        ))}
      </nav>
    ) : null;

  const results = posts.length ? (
    <Posts posts={posts} layout={layout} columns={columns} card={card} />
  ) : (
    <p className="bch-shop__empty">
      {active.search ? `No articles match “${active.search}” yet.` : "New articles are on the way."}
    </p>
  );

  const pages = filterable ? <Pages meta={listing?.meta} hrefFor={(page) => pageHref(hrefWith({}), page)} /> : null;

  return (
    <section className="bch-blog" id={section.anchor || undefined}>
      <div className="bch-container">
        <div className="bch-blog__head">
          <SectionHeader data={data} size="md" />
          {!filterable ? <CtaLink label={data.link_label} url={data.link_url} variant="link" /> : null}
        </div>

        {chips}
        {filterable && active.search && filterStyle === "chips" ? (
          <p className="bch-blog__searching">
            Showing results for “{active.search}”. <Link href={hrefWith({ search: "" })} className="bch-link">Clear</Link>
          </p>
        ) : null}

        {filterStyle === "sidebar" ? (
          <div className="bch-blog__layout">
            <div className="bch-blog__main">
              {results}
              {pages}
            </div>
            <aside className="bch-blog__sidebar" aria-label="Browse the library">
              {blocks.map((block) => (
                <SidebarBlock
                  key={block}
                  block={block}
                  data={data}
                  active={active}
                  categories={visibleCategories}
                  featured={featured?.data ?? []}
                  hrefWith={hrefWith}
                />
              ))}
            </aside>
          </div>
        ) : (
          <>
            {results}
            {pages}
          </>
        )}
      </div>
    </section>
  );
}

function Posts({ posts, layout, columns, card }) {
  if (layout === "rows") {
    return (
      <ul className="bch-blog__rows">
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} variant="row" {...card} />
          </li>
        ))}
      </ul>
    );
  }

  const [lead, ...rest] = layout === "magazine" ? posts : [null, ...posts];

  return (
    <>
      {lead ? <PostCard post={lead} variant="feature" headingLevel={2} {...card} /> : null}
      {rest.length ? (
        <ul className={`bch-blog__tiles bch-blog__tiles--cols-${columns}`}>
          {rest.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} variant="tile" {...card} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function SidebarBlock({ block, data, active, categories, featured, hrefWith }) {
  if (block === "search") {
    return (
      <form className="bch-side bch-side--search" role="search" method="get" action={data.base_path || "/blog"}>
        <label>
          <span className="bch-eyebrow">Search articles</span>
          <input type="search" name="search" defaultValue={active.search} placeholder="Sleep, hot flashes, labs…" />
        </label>
        {active.category && !data.preset_category ? <input type="hidden" name="category" value={active.category} /> : null}
      </form>
    );
  }

  if (block === "categories" && categories.length && !data.preset_category) {
    return (
      <nav className="bch-side" aria-label="Topics">
        <p className="bch-eyebrow">Topics</p>
        <ul className="bch-side__list">
          <li>
            <Link href={hrefWith({ category: "" })} aria-current={!active.category ? "page" : undefined}>
              All articles
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link href={hrefWith({ category: category.slug })} aria-current={active.category === category.slug ? "page" : undefined}>
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (block === "featured" && featured.length) {
    return (
      <div className="bch-side">
        <p className="bch-eyebrow">Most read</p>
        <ol className="bch-side__featured">
          {featured.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block === "cta" && data.sidebar_cta_heading) {
    return (
      <div className="bch-side bch-side--cta">
        <p className="bch-display bch-display--sm">{data.sidebar_cta_heading}</p>
        {data.sidebar_cta_body ? <p>{data.sidebar_cta_body}</p> : null}
        <CtaLink label={data.sidebar_cta_label} url={data.sidebar_cta_url} variant="primary" />
      </div>
    );
  }

  return null;
}

function Pages({ meta, hrefFor }) {
  const last = meta?.last_page ?? 1;
  const current = meta?.current_page ?? 1;

  if (last <= 1) {
    return null;
  }

  return (
    <nav className="bch-pages" aria-label="Pages">
      {Array.from({ length: last }, (_, index) => index + 1).map((page) =>
        page === current ? (
          <span key={page} aria-current="page">
            {page}
          </span>
        ) : (
          <Link key={page} href={hrefFor(page)}>
            {page}
          </Link>
        ),
      )}
    </nav>
  );
}

function pageHref(href, page) {
  const [path, qs = ""] = href.split("?");
  const params = new URLSearchParams(qs);
  if (page > 1) params.set("page", String(page));
  const next = params.toString();
  return next ? `${path}?${next}` : path;
}
