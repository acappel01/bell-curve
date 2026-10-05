import Link from "next/link";
import Html from "@/components/Html";
import SectionRenderer from "@/components/SectionRenderer";
import { normalizePresentation } from "@/components/productDetails/presentation";
import { getConfig } from "@/lib/api";
import { usingFixtures } from "@/lib/fixtures";
import { serviceAction } from "@/lib/services";
import Gallery from "./Gallery";
import ProductCard from "./ProductCard";
import PurchaseOptions from "./PurchaseOptions";

/**
 * BCH product and bundle page (`frontend_template: bell-curve`), fed by the
 * same /catalog detail payload as the Atlas templates.
 *
 * Order: gallery | name, price and buy box, highlights, accordions → the
 * record's "tab" detail sections as a details band → the sections an operator
 * placed on the record (FAQs, reviews, any BCH section) → "You may also like".
 *
 * Every block is driven by the record or its `detail_layout` knobs
 * (`normalizePresentation`, shared with Atlas): accordion placement, which
 * rails show, and where the highlights sit. Nothing here is per-product code.
 */
export default async function ProductDetail({ item, kind }) {
  const pres = normalizePresentation(item.detail_layout);
  const config = await getConfig();
  const careAction = item.rx_required ? serviceAction(config?.services, "care") : null;

  const listing =
    kind === "package" ? { href: "/stacks", label: "Bundles & plans" } : { href: "/products", label: "All products" };

  const accordions = [
    item.description && { title: kind === "package" ? "About this bundle" : "About this product", html: item.description },
    ...(item.detail_sections ?? [])
      .filter((section) => section.placement === "accordion")
      .map((section) => ({ title: section.title, html: section.content })),
    kind === "package" &&
      item.products?.length && {
        title: "What's included",
        list: item.products.map((product) => ({ name: product.name, slug: product.slug, note: product.subtitle })),
      },
    kind === "product" &&
      item.ingredients?.length && {
        title: "Ingredients",
        list: item.ingredients.map((ingredient) => ({ name: ingredient.name, note: ingredient.label })),
      },
  ].filter(Boolean);

  const tabs = (item.detail_sections ?? []).filter((section) => section.placement === "tab");
  const highlights = pres.highlightsPosition === "none" ? [] : (item.highlights ?? []);
  const goals = item.health_goals ?? [];

  const accordionList = accordions.length ? (
    <div className="bch-pdp__accordions">
      {accordions.map((block, index) => (
        <details key={block.title} className="bch-acc" open={index === 0}>
          <summary>{block.title}</summary>
          {block.html ? <Html value={block.html} className="bch-acc__body" /> : null}
          {block.list ? (
            <ul className="bch-acc__list">
              {block.list.map((entry) => (
                <li key={entry.name}>
                  {entry.slug ? <Link href={`/products/${entry.slug}`}>{entry.name}</Link> : <strong>{entry.name}</strong>}
                  {entry.note ? <span>{entry.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ))}
    </div>
  ) : null;

  // One rail, filtered the way the Atlas rails split `related[]`: "related"
  // is everything, "stacks" bundles only, "associated" products only.
  const railTypes = pres.rails.includes("related")
    ? null
    : [pres.rails.includes("stacks") && "package", pres.rails.includes("associated") && "product"].filter(Boolean);
  const related = (item.related ?? []).filter((entry) => !railTypes || railTypes.includes(entry.type)).slice(0, 4);
  const showRelated = pres.rails.length > 0 && related.length > 0;

  return (
    <>
      <nav className="bch-crumbs bch-container" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <Link href={listing.href}>{listing.label}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{item.name}</span>
      </nav>

      <section className="bch-pdp">
        <div className="bch-container bch-pdp__grid">
          <div className="bch-pdp__media">
            <Gallery item={item} />
          </div>

          <div className="bch-pdp__info">
            {goals.length ? <p className="bch-pdp__goals">{goals.map((goal) => goal.name).join(" · ")}</p> : null}
            <h1 className="bch-display bch-display--lg bch-pdp__title">{item.name}</h1>
            {item.subtitle ? <p className="bch-pdp__subtitle">{item.subtitle}</p> : null}
            {item.short_description ? <p className="bch-lead bch-pdp__lead">{item.short_description}</p> : null}

            {pres.highlightsPosition === "above" && highlights.length ? <Highlights items={highlights} /> : null}

            <PurchaseOptions item={item} kind={kind} preview={usingFixtures()} careAction={careAction} />

            {pres.highlightsPosition === "below" && highlights.length ? <Highlights items={highlights} /> : null}

            {pres.accordions.placement === "side" ? accordionList : null}
          </div>
        </div>

        {pres.accordions.placement === "below" && accordionList ? (
          <div className="bch-container bch-pdp__below">{accordionList}</div>
        ) : null}
      </section>

      {tabs.length ? (
        <section className="bch-pdp-details">
          <div className="bch-container">
            {tabs.map((tab) => (
              <div key={tab.title} className="bch-pdp-details__row">
                <h2 className="bch-display bch-display--sm">{tab.title}</h2>
                <Html value={tab.content} className="bch-pdp-details__body" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <SectionRenderer sections={item.sections ?? []} item={item} />

      {showRelated ? (
        <section className="bch-listing bch-listing--rail">
          <div className="bch-container">
            <div className="bch-head bch-head--left">
              <h2 className="bch-display bch-display--md">You may also like</h2>
            </div>
            <ul className="bch-shop__grid bch-shop__grid--grid bch-shop__grid--cols-4">
              {related.map((entry) => (
                <li key={`${entry.type}-${entry.slug}`}>
                  <ProductCard item={entry} kind={entry.type} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Highlights({ items }) {
  return (
    <ul className="bch-pdp__highlights">
      {items.map((highlight) => (
        <li key={highlight.text}>{highlight.text}</li>
      ))}
    </ul>
  );
}
