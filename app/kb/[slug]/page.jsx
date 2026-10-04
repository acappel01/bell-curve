import Link from "next/link";
import { notFound } from "next/navigation";
import { redirectRenamedSlug } from "@/lib/slugRedirect";
import Breadcrumb from "@/components/productDetails/Breadcrumb";
import Html from "@/components/Html";
import JsonLd from "@/components/JsonLd";
import { getKbCompound } from "@/lib/api";
import { toPlainText } from "@/lib/richText";
import { KB_BASE_PATH, productHref } from "@/lib/routes";
import { canonical, compoundJsonLd } from "@/lib/seo";

export const revalidate = 300;

/**
 * The monograph's sections, in reading order.
 *
 * Deliberately NOT the order they sit in the database. `patient_summary` is
 * the one section in the seed data already written for the person considering
 * the compound rather than for a prescriber, so it leads; the clinical detail
 * stays available underneath rather than being cut, because the combination is
 * what makes the page worth reading and hard to substitute.
 */
const SECTIONS = [
  { key: "patient_summary", title: "In plain terms" },
  { key: "overview", title: "Overview" },
  { key: "mechanism_of_action", title: "How it works" },
  { key: "dosing_guidelines", title: "Dosing" },
  { key: "clinical_evidence", title: "Clinical evidence" },
  { key: "safety_profile", title: "Safety and side effects" },
  { key: "pharmacology", title: "Pharmacology" },
];

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const compound = await getKbCompound(slug);

  if (!compound) {
    return {};
  }

  return {
    title: compound.seo?.meta_title || compound.name,
    description:
      compound.seo?.meta_description || toPlainText(compound.description).slice(0, 160) || undefined,
    openGraph: compound.seo?.og_image_url ? { images: [compound.seo.og_image_url] } : undefined,
    ...canonical(`${KB_BASE_PATH}/${compound.slug}`),
  };
}

/**
 * A knowledge-base monograph.
 *
 * Three things on this page are not decoration:
 *
 * - **The provenance block.** This text is summarised from the operator's own
 *   clinical literature corpus by a retrieval pipeline, and saying so with the
 *   number of sources behind it is a stronger claim than a byline — it is
 *   content nobody else can publish. A clinician byline renders too, but only
 *   when someone genuinely reviewed the page; most will not have one, and
 *   manufacturing one would assert a review that did not happen.
 * - **The regulatory notice**, shown whenever the compound has no approved
 *   human use. The visitor is told before the prose, not somewhere inside
 *   4,000 words of pharmacology.
 * - **The products block.** The compound-to-product link is the thing a
 *   generic health wiki cannot publish, and the reason this page belongs on a
 *   commerce site rather than being a blog post.
 */
export default async function CompoundPage({ params }) {
  const { slug } = await params;
  const compound = await getKbCompound(slug);

  if (!compound) {
    // A renamed monograph should still resolve from its old address. This
    // runs first because the backend only answers when NOTHING live holds the
    // slug, so it cannot leak the existence of an unpublished draft.
    await redirectRenamedSlug("kb_compound", slug);

    // Null here means "not public" — unpublished, or published with no
    // regulatory status. Both are a 404 rather than a placeholder: the
    // existence of an unpublished draft is not public information.
    notFound();
  }

  const regulatory = compound.regulatory ?? null;
  const reviewer = compound.reviewed_by ?? null;
  const products = compound.products ?? [];
  const references = compound.clinical_references ?? [];
  const monograph = compound.monograph ?? {};
  const aliases = [...(compound.brand_names ?? []), ...(compound.synonyms ?? [])].filter(Boolean);

  const sections = SECTIONS.filter(({ key }) => Boolean(monograph[key]));
  const provenance = compound.provenance ?? {};

  return (
    <>
      <Breadcrumb name={compound.name} listingHref={KB_BASE_PATH} listingLabel="Knowledge base" />

      <JsonLd data={compoundJsonLd(compound)} />

      {/* `sx-width--narrow` (960px), not a max-width in the partial.
          A monograph is 28,000 characters of prose and the site's default
          column runs to ~150 characters a line, which is unreadable — but a
          cap set in `_kb.scss` would land on a descendant of what the width
          token targets and beat it invisibly, the way the footer disclaimer's
          was flattened. These are application routes with no operator behind
          them, so this app picks the token; it does so in the frame's own
          vocabulary, and retuning the scale still moves this page with it. */}
      <article className="kb-monograph sx-section sx-width--narrow">
        <div className="container sx-content">
          <header className="kb-monograph__header">
            <h1 className="kb-monograph__title">{compound.name}</h1>

            {compound.tagline ? (
              <p className="kb-monograph__tagline">{compound.tagline}</p>
            ) : null}

            <dl className="kb-facts">
              {regulatory ? (
                <div className="kb-facts__item">
                  <dt>Regulatory status</dt>
                  <dd>{regulatory.label}</dd>
                </div>
              ) : null}
              {compound.route_of_administration ? (
                <div className="kb-facts__item">
                  <dt>Route</dt>
                  <dd>{compound.route_of_administration}</dd>
                </div>
              ) : null}
              {aliases.length ? (
                <div className="kb-facts__item">
                  <dt>Also known as</dt>
                  <dd>{[...new Set(aliases)].join(", ")}</dd>
                </div>
              ) : null}
            </dl>

            {reviewer?.name ? (
              <p className="kb-monograph__byline">
                Reviewed by <strong>{reviewer.name}</strong>
                {reviewer.credentials ? `, ${reviewer.credentials}` : ""}
                {compound.reviewed_at ? (
                  <>
                    {" · "}
                    <time dateTime={compound.reviewed_at}>
                      last reviewed{" "}
                      {new Date(compound.reviewed_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </>
                ) : null}
              </p>
            ) : null}
          </header>

          {regulatory && !regulatory.is_approved_for_human_use ? (
            <aside className="kb-notice" role="note">
              <p className="kb-notice__title">{regulatory.label}</p>
              <p className="kb-notice__body">{regulatory.description}</p>
            </aside>
          ) : null}

          <Html value={compound.description} className="kb-monograph__summary" />

          {sections.length > 1 ? (
            <nav className="kb-toc" aria-label="On this page">
              <p className="kb-toc__label">On this page</p>
              <ul className="kb-toc__list">
                {sections.map(({ key, title }) => (
                  <li key={key}>
                    <a href={`#${key.replace(/_/g, "-")}`}>{title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {sections.map(({ key, title }) => (
            <section key={key} className="kb-section" id={key.replace(/_/g, "-")}>
              <h2 className="kb-section__title">{title}</h2>
              {/* Prose mode: these carry their own headings, lists and dosing
                  tables, and `.rich-text` styles them. */}
              <Html value={monograph[key]} />
            </section>
          ))}

          {products.length ? (
            <section className="kb-products" id="available-as">
              <h2 className="kb-section__title">Available as</h2>
              <ul className="kb-products__list">
                {products.map((product) => (
                  <li key={product.slug} className="kb-products__item">
                    <Link href={productHref(product.slug)}>{product.name}</Link>
                    {product.subtitle ? (
                      <span className="kb-products__subtitle">{product.subtitle}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* The caveat is NOT nested inside the source-count check.
              A monograph authored by hand in the admin has no retrieval counts
              — those are import-only — so nesting it meant the one page most
              likely to need the caveat was the one page that never showed it.
              It hangs off the absence of a reviewer, which is the fact it is
              actually about. */}
          {provenance.source_count || !reviewer?.name ? (
            <section className="kb-provenance" id="how-this-was-made">
              <h2 className="kb-section__title">How this page was made</h2>

              {provenance.source_count ? (
                <p className="kb-provenance__body">
                  Summarised from <strong>{provenance.source_count.toLocaleString()}</strong>{" "}
                  clinical sources in our research library — published literature and clinical
                  excerpts, retrieved and condensed into plain language.
                  {/* A separate retrieval pass, NOT a subset — it exceeds the
                      document count on plenty of compounds (BPC-157: 14 and 22),
                      so "22 of them" would be false. */}
                  {provenance.dosing_source_count ? (
                    <>
                      {" "}
                      Dosing guidance drew on a further{" "}
                      {provenance.dosing_source_count.toLocaleString()}.
                    </>
                  ) : null}
                  {references.length ? (
                    <>
                      {" "}
                      The {references.length} references below are the citations that summary
                      rests on.
                    </>
                  ) : null}
                </p>
              ) : null}

              {!reviewer?.name ? (
                <p className="kb-provenance__caveat">
                  It has not been individually reviewed by one of our clinicians, and it is
                  educational rather than medical advice.
                </p>
              ) : null}
            </section>
          ) : null}

          {references.length ? (
            <section className="kb-references" id="references">
              <h2 className="kb-section__title">References</h2>
              <ol className="kb-references__list">
                {references.map((reference, index) => (
                  // Citations are stable strings with no id of their own, and
                  // the list is render-only — the index is the only key
                  // available and nothing reorders it.
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={index}>{reference}</li>
                ))}
              </ol>
            </section>
          ) : null}

          <footer className="kb-monograph__footer">
            <Link href={KB_BASE_PATH}>← All compounds</Link>
          </footer>
        </div>
      </article>
    </>
  );
}
