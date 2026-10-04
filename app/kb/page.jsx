import Link from "next/link";
import Breadcrumb from "@/components/catalog/Breadcrumb";
import CompoundCard from "@/components/kb/CompoundCard";
import KbFilters from "@/components/kb/KbFilters";
import { apiParamsFromSearch, withParam } from "@/components/kb/query";
import JsonLd from "@/components/JsonLd";
import { getKbCompounds } from "@/lib/api";
import { canonical, kbIndexJsonLd } from "@/lib/seo";
import { KB_BASE_PATH } from "@/lib/routes";

export const revalidate = 300;

export async function generateMetadata() {
  return {
    title: "Peptide knowledge base",
    description:
      "Reviewed monographs on the peptides and compounds we work with — what each one is, how it works, how it is dosed, and where it stands with the FDA.",
    ...canonical(KB_BASE_PATH),
  };
}

/**
 * Knowledge-base index — an application route, not a CMS page.
 *
 * Filter state is entirely in the URL, so every view here is a shareable,
 * server-rendered address and there is no client-side refetching. `KbFilters`
 * is the only client component on the page and it does nothing but rewrite
 * that URL.
 *
 * The empty state is not a placeholder. On a fresh install this list is empty
 * BY DESIGN: monographs import unpublished, and the backend hides any without a
 * confirmed regulatory status. An operator seeing "nothing here yet" after an
 * import is seeing the gate working, so the copy says so rather than reading
 * like a bug.
 */
export default async function KnowledgeBasePage({ searchParams }) {
  const params = await searchParams;
  const listing = await getKbCompounds(apiParamsFromSearch(params));

  const compounds = listing?.data ?? [];
  const meta = listing?.meta ?? null;
  const total = meta?.total ?? compounds.length;
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  // `sort` is deliberately absent: it cannot empty a list, so a sorted-but-
  // unfiltered view showing "try a broader search" would be wrong. KbFilters
  // includes it in its own check because "Clear filters" should reset it —
  // different question, different answer.
  const hasFilters = ["search", "status", "all"].some((key) => params?.[key]);

  return (
    <>
      <Breadcrumb
        pageName="Knowledge base"
        pageTitle="Peptide knowledge base"
        backgroundImage="/images/banner/shop-header.jpg"
      />

      <JsonLd
        data={kbIndexJsonLd({
          name: "Peptide knowledge base",
          description:
            "Reviewed monographs on the peptides and compounds we work with.",
          items: compounds,
        })}
      />

      <section className="kb-index sx-section">
        <div className="container sx-content">
          <KbFilters total={total} />

          {compounds.length ? (
            <div className="kb-grid">
              {compounds.map((compound) => (
                <CompoundCard key={compound.slug} compound={compound} />
              ))}
            </div>
          ) : (
            <div className="kb-empty">
              {hasFilters ? (
                <>
                  <p className="kb-empty__title">No compounds match those filters.</p>
                  <p className="kb-empty__body">
                    Try a broader search, or include non-peptide compounds.
                  </p>
                </>
              ) : (
                <>
                  <p className="kb-empty__title">No monographs are published yet.</p>
                  <p className="kb-empty__body">
                    Each entry is checked and published individually before it appears here.
                  </p>
                </>
              )}
            </div>
          )}

          {lastPage > 1 ? (
            <nav className="kb-pagination" aria-label="Knowledge base pages">
              {currentPage > 1 ? (
                <Link
                  className="kb-pagination__link"
                  href={`${KB_BASE_PATH}${withParam(params, "page", currentPage - 1 > 1 ? currentPage - 1 : "")}`}
                  rel="prev"
                >
                  Previous
                </Link>
              ) : null}

              <span className="kb-pagination__status">
                Page {currentPage} of {lastPage}
              </span>

              {currentPage < lastPage ? (
                <Link
                  className="kb-pagination__link"
                  href={`${KB_BASE_PATH}${withParam(params, "page", currentPage + 1)}`}
                  rel="next"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}
