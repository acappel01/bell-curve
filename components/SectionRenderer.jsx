/**
 * Renders a CMS section envelope: { type, origin, anchor, global, data, schema? }.
 *
 * Register real components in SECTION_COMPONENTS as they're built — one per
 * backend blueprint type (hero, faq, product-slider, …). Anything unregistered
 * (including admin-defined flexible types, which carry a `schema` field-kind
 * map for generic rendering) falls through to the placeholder so new backend
 * types are visible immediately instead of silently dropped — in DEV. On a live
 * page the section is dropped whole and logged; see `isDroppedInProduction`.
 *
 * A section the backend reports as having no authored content renders nothing,
 * whatever its type — see the note on `has_content` below.
 *
 * `item` is the catalog record when these sections are rendered on a product
 * or stack detail page, and null everywhere else. Two section types read it —
 * `item-faqs` and `item-reviews` show the record's own FAQs and reviews rather
 * than carrying copies of them — so the envelope stays self-contained for
 * every other type and the payload is not duplicated.
 *
 * `query` is the page's search params, for the few types whose content is a
 * filtered listing (`catalog-listing`, `blog-listing`): filters live in the
 * URL so a filtered view is a shareable, server-rendered page. Only the
 * listing routes pass it (see CmsPageView's `cmsOverride`); null means "not a
 * filterable page", and a listing then renders as a fixed collection. Every
 * other type ignores it. Listings on one page share the query string.
 *
 * The operator's presentation knobs live in lib/sectionKnobs.js, shared with
 * ChildBlockRenderer: a knob means the same thing on a typed sub-block as on
 * the section holding it, so the JS is one implementation. The CSS is not —
 * see that module's note on why children carry an `sxb-*` vocabulary.
 */

import { isContentEmpty, knobs } from "@/lib/sectionKnobs";

import BenefitsDiagramSection from "@/components/sections/BenefitsDiagramSection";
import BenefitsSection from "@/components/sections/BenefitsSection";
import CategoryGridSection from "@/components/sections/CategoryGridSection";
import HighlightBannerSection from "@/components/sections/HighlightBannerSection";
import HtmlBlockSection from "@/components/sections/HtmlBlockSection";
import ImageCalloutBannerSection from "@/components/sections/ImageCalloutBannerSection";
import ComparisonTableSection from "@/components/sections/ComparisonTableSection";
import FlexibleSection from "@/components/sections/FlexibleSection";
import PackageSliderSection from "@/components/sections/PackageSliderSection";
import ProductSliderSection from "@/components/sections/ProductSliderSection";
import QuizCtaSection from "@/components/sections/QuizCtaSection";
import QuizSection from "@/components/sections/QuizSection";
import TimelineSection from "@/components/sections/TimelineSection";
import FaqCategoriesSection from "@/components/sections/FaqCategoriesSection";
import ItemFaqsSection from "@/components/sections/ItemFaqsSection";
import ItemReviewsSection from "@/components/sections/ItemReviewsSection";
import FinalCtaSection from "@/components/sections/FinalCtaSection";
import PhysiciansSection from "@/components/sections/PhysiciansSection";
import ResultsStatsSection from "@/components/sections/ResultsStatsSection";
import StatsMarqueeSection from "@/components/sections/StatsMarqueeSection";
import StorySection from "@/components/sections/StorySection";
import VideoEmbedSection from "@/components/sections/VideoEmbedSection";

// Bell Curve Health template components.
import ArticleRowSection from "@/components/bch/ArticleRowSection";
import CardsSection from "@/components/bch/CardsSection";
import FaqSection from "@/components/bch/FaqSection";
import PricingSection from "@/components/bch/PricingSection";
import ProseSection from "@/components/bch/ProseSection";
import StepsSection from "@/components/bch/StepsSection";
import TestimonialsSection from "@/components/bch/TestimonialsSection";
import WaitlistSection from "@/components/bch/WaitlistSection";
import FormSection from "@/components/bch/FormSection";
import CatalogListingSection from "@/components/bch/catalog/CatalogListingSection";
import BlogListingSection from "@/components/bch/blog/BlogListingSection";
import CtaBannerSection from "@/components/bch/CtaBannerSection";
import FounderSection from "@/components/bch/FounderSection";
import HealthMapTeaserSection from "@/components/bch/HealthMapTeaserSection";
import HeroSection from "@/components/bch/HeroSection";
import PathsSection from "@/components/bch/PathsSection";
import SplitSection from "@/components/bch/SplitSection";
import StatementSection from "@/components/bch/StatementSection";
import TrustStripSection from "@/components/bch/TrustStripSection";

const SECTION_COMPONENTS = {
  hero: HeroSection,
  "how-it-works": StepsSection,
  "features-grid": CardsSection,
  "pricing-tiers": PricingSection,
  testimonials: TestimonialsSection,
  "text-block": ProseSection,
  faq: FaqSection,
  "faq-categories": FaqCategoriesSection,
  "final-cta": FinalCtaSection,
  "quiz-cta": QuizCtaSection,
  quiz: QuizSection,
  "html-block": HtmlBlockSection,
  "cta-banner": CtaBannerSection,
  "image-text-split": SplitSection,
  physicians: PhysiciansSection,
  "stats-marquee": StatsMarqueeSection,
  "results-stats": ResultsStatsSection,
  story: StorySection,
  "benefits-him": BenefitsSection,
  "benefits-her": BenefitsSection,
  "package-slider": PackageSliderSection,
  "product-slider": ProductSliderSection,
  "category-grid": CategoryGridSection,
  "highlight-banner": HighlightBannerSection,
  "benefits-diagram": BenefitsDiagramSection,
  // Catalog-only types: they read the record SectionRenderer is given, so they
  // render nothing on a CMS page. The backend keeps them out of the page
  // picker; this map is the frontend half of the same contract.
  "item-faqs": ItemFaqsSection,
  "item-reviews": ItemReviewsSection,
  "image-callout-banner": ImageCalloutBannerSection,
  timeline: TimelineSection,
  "video-embed": VideoEmbedSection,
  // Flexible (admin-defined) types can also be registered here by slug for
  // exact theme markup; unregistered ones fall through to FlexibleSection.
  "comparison-table": ComparisonTableSection,
  // BCH flexible types. Their schemas live in fixtures/bch and are what the
  // backend seeder registers as Custom Section Types.
  "bch-trust-strip": TrustStripSection,
  "bch-health-map-teaser": HealthMapTeaserSection,
  "bch-statement": StatementSection,
  "bch-paths": PathsSection,
  "bch-article-row": ArticleRowSection,
  "bch-founder": FounderSection,
  "bch-waitlist": WaitlistSection,
  "bch-form": FormSection,
  // Listings as sections (code blueprint proposals; see each component).
  "catalog-listing": CatalogListingSection,
  "blog-listing": BlogListingSection,
};

/**
 * Unregistered, schema-less type — one of the backend's code-origin blueprints
 * that has no component here yet. DEV ONLY; the production path drops the
 * section entirely before this is reached (see `isDroppedInProduction` below,
 * and note that the drop cannot live in here).
 *
 * IT SAYS WHAT IT IS, and the payload is collapsed behind a disclosure. The
 * first version dumped raw `JSON.stringify` under a bare heading, which reads
 * as a page that has broken rather than as a deliberate development signal —
 * it was reported as a bug twice by someone whose local server is, correctly,
 * a dev server. The styles are inline on purpose: this must never need a SCSS
 * partial, since it is not part of the theme and never ships to a visitor.
 */
function PlaceholderSection({ section }) {
  return (
    <section
      id={section.anchor || undefined}
      className={`placeholder-section section--${section.global?.slug || section.type}`}
      style={{
        margin: "8px 0",
        padding: "12px 16px",
        border: "1px dashed #b45309",
        borderRadius: "8px",
        background: "#fffbeb",
        color: "#7c2d12",
        font: "13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <strong>Dev only — no component for section type “{section.type}”</strong>
      <div style={{ marginTop: 4 }}>
        Nothing renders here on a live page. To build it, add a component and register
        it in <code>SECTION_COMPONENTS</code> ({section.origin} blueprint).
      </div>
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer" }}>Payload</summary>
        <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", overflowX: "auto" }}>
          {JSON.stringify(section.data, null, 2)}
        </pre>
      </details>
    </section>
  );
}

/**
 * Should this section vanish entirely on a live page?
 *
 * Only unregistered, schema-less types — the ones that would otherwise fall to
 * PlaceholderSection and dump `JSON.stringify(section.data)` at a visitor,
 * leaking the blueprint's field names and whatever copy an operator has staged
 * but not shipped. Hard rule 3 is "visible in DEV", and this is the half that
 * was missing.
 *
 * THE CHECK CANNOT LIVE INSIDE PlaceholderSection, which is where it was first
 * written. Returning null from the component still leaves the knob wrapper
 * below, and every unregistered type carries a LayoutDefaults
 * entry, so the wrapper always renders: an operator who set `style_padding_top: lg`
 * and a background colour would get a padded, painted, entirely empty band in
 * the middle of the page. Dropping the whole entry here — above `knobs()` — is
 * the only place "renders nothing" is true of the DOM and not just of the
 * component. Caught by fable-review-gate before this shipped.
 *
 * Latent rather than live: as of 2026-08-25 none of the then-unregistered six
 * (`features-grid`, `package-pricing-comparison`, `pricing-tiers`,
 * `product-callout`, `product-grid`, `transformed`) was placed on any row of
 * page_sections, catalog_item_sections or global_sections. The Bell Curve
 * template has since registered `features-grid` and `pricing-tiers`. Gated now because placing one is a
 * single click in the admin and the failure would be silent to whoever clicked.
 *
 * The warn is a trace, not a per-request alarm: on a statically prerendered
 * route it fires at build time and then once per ISR revalidation. Enough to
 * stop a type going unbuilt forever, not enough to notice quickly.
 */
function isDroppedInProduction(Component, section) {
  if (Component !== PlaceholderSection || process.env.NODE_ENV !== "production") {
    return false;
  }

  console.warn(
    `[SectionRenderer] No component for section type "${section.type}" ` +
      `(origin: ${section.origin}) — rendered nothing. Register it in SECTION_COMPONENTS.`
  );

  return true;
}

export default function SectionRenderer({ sections, item = null, query = null }) {
  if (!sections?.length) {
    return null;
  }

  return sections.map((section, index) => {
    const key = `${section.type}-${index}`;

    // "A section with no authored content renders nothing" — enforced here for
    // EVERY type, not just unregistered ones. Previously a registered
    // component rendered whatever its payload held, so an untouched scaffold
    // still emitted its shell (a bare <h2>, an empty banner) onto a live page.
    //
    // The backend classifies this, because only it knows which of a
    // blueprint's keys are structural flags rather than copy. Older payloads
    // without the flag fall back to the local heuristic.
    const hasContent = section.has_content ?? !isContentEmpty(section.data);

    if (!hasContent) {
      return null;
    }

    const Component =
      SECTION_COMPONENTS[section.type] ??
      (section.schema ? FlexibleSection : PlaceholderSection);

    if (isDroppedInProduction(Component, section)) {
      return null;
    }

    // Wrap only when a knob resolves to something. The backend now merges a
    // per-type design default, so in practice most sections wrap — but a type
    // that declares no default and an operator who set nothing still render
    // exactly the DOM they always did.
    const { className, style } = knobs(section.data);

    if (className) {
      return (
        <div key={key} className={className} style={style}>
          <Component section={section} item={item} query={query} />
        </div>
      );
    }

    return <Component key={key} section={section} item={item} query={query} />;
  });
}
