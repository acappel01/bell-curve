import Link from "next/link";
import Html from "@/components/Html";
import { compoundHref } from "@/lib/routes";

/**
 * One monograph on the knowledge-base index.
 *
 * The regulatory badge is on the card, not only on the detail page. A visitor
 * scanning a list of compounds should be able to see which of them are
 * approved medicines and which are research chemicals without opening each
 * one — that difference is the most consequential thing about any row here.
 *
 * The label and its colour come from the API payload rather than being derived
 * from the status string locally: the backend owns that vocabulary, and a new
 * status added there would otherwise render as unstyled text here.
 */

/** Regulatory value → the card's badge modifier. Colour is decoration; the label carries the meaning. */
const BADGE_MODIFIER = {
  fda_approved: "kb-badge--approved",
  supplement: "kb-badge--supplement",
  compounded: "kb-badge--compounded",
  investigational: "kb-badge--investigational",
  research_only: "kb-badge--research",
  unapproved: "kb-badge--research",
};

export default function CompoundCard({ compound }) {
  if (!compound?.slug) {
    return null;
  }

  const href = compoundHref(compound.slug);
  const regulatory = compound.regulatory ?? null;
  const reviewer = compound.reviewed_by ?? null;
  const productCount = compound.products?.length ?? 0;

  return (
    <article className="kb-card">
      <Link href={href} className="kb-card__link">
        <h2 className="kb-card__title">{compound.name}</h2>
      </Link>

      {regulatory ? (
        <p
          className={`kb-badge ${BADGE_MODIFIER[regulatory.value] ?? ""}`}
          title={regulatory.description}
        >
          {regulatory.label}
        </p>
      ) : null}

      {compound.tagline ? <p className="kb-card__tagline">{compound.tagline}</p> : null}

      {/* Prose, not inline: the summary is authored in a rich editor and may
          carry more than one paragraph. Html renders nothing when empty. */}
      <Html value={compound.description} className="kb-card__summary" />

      {/* Rendered only when there is something to put in it — an empty
          <p> would still take its flex gap and push the card taller. */}
      {compound.provenance?.source_count || reviewer?.name || productCount > 0 ? (
      <p className="kb-card__meta">
        {/* Source count before the byline: most monographs have no reviewer,
            and the size of the evidence base behind the page is the claim that
            is true of all of them. */}
        {compound.provenance?.source_count ? (
          <span className="kb-card__sources">
            {compound.provenance.source_count.toLocaleString()} clinical sources
          </span>
        ) : null}
        {reviewer?.name ? (
          <span className="kb-card__reviewer">
            Reviewed by {reviewer.name}
            {reviewer.credentials ? `, ${reviewer.credentials}` : ""}
          </span>
        ) : null}
        {productCount > 0 ? (
          <span className="kb-card__products">
            In {productCount} {productCount === 1 ? "product" : "products"}
          </span>
        ) : null}
      </p>
      ) : null}
    </article>
  );
}
