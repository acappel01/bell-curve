import { toPlainText } from "@/lib/richText";
import { categoryHref } from "@/lib/routes";

/**
 * `category-grid` blueprint → theme "Categories2" card grid. Data:
 * categories[] — inlined catalog categories (name, slug, hero_image_url).
 *
 * The `pt-24` wrapper div this used to open with is gone. It existed only to
 * carry 24px of top padding and the section's anchor, which meant the anchor
 * pointed at a div rather than at the <section> an in-page link should land
 * on. The padding is now the band's own `padding-block-start` and the anchor
 * is on the <section>, which also removes the extra element between the knob
 * wrapper and `.sx-section`.
 */
export default function CategoryGridSection({ section }) {
  const data = section.data ?? {};
  const categories = data.categories ?? [];

  if (!categories.length) {
    return null;
  }

  return (
    <section
      id={section.anchor || undefined}
      className="categorySection sx-section"
      aria-label={toPlainText(data.heading) || "Explore wellness programs"}
    >
      <div className="categoryGrid sx-content">
        {categories.map((category) => (
          <a className="categoryCard" href={categoryHref(category.slug)} key={category.slug ?? category.id}>
            <div className="categoryHeader">
              <div className="categoryName">
                <span className="categoryMark" aria-hidden="true" />
                <span>{category.name}</span>
              </div>
              <svg
                className="arrow"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M5 12H19" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="3" />
              </svg>
            </div>
            {category.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="penImage" src={category.hero_image_url} alt="" aria-hidden="true" />
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
