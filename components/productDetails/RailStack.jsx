import RecommendedProducts from "./RecommendedProducts";

/**
 * The recommendation rails at the foot of a detail page, in the order and
 * selection the operator chose (`detail_layout.rails`).
 *
 * Extracted because the classic route ignored the knob entirely and always
 * rendered a single unconditional "People Also Bought", while the conversion
 * template honoured it — the same setting doing two different things
 * depending on a template the operator picks elsewhere. One implementation.
 *
 * All three rails are views of ONE payload: `related` is the mixed
 * operator-curated list, and `stacks` / `associated` are its package-only and
 * product-only subsets. Nothing here is behavioural — none of it is order
 * history; it is the `catalog_relations` an operator curated by hand.
 *
 * An empty `rails` renders nothing at all, which is a real operator choice
 * and not a fallback — see normalizePresentation.
 */
export default function RailStack({ related = [], rails = [] }) {
  const blocks = {
    related: { title: "People Also Bought", items: related },
    stacks: {
      title: "Pairs Well With These Stacks",
      items: related.filter((entry) => entry.type === "package"),
    },
    associated: {
      title: "Associated Products",
      items: related.filter((entry) => entry.type !== "package"),
    },
  };

  return rails.map((key) => {
    const rail = blocks[key];

    return rail?.items?.length ? (
      <RecommendedProducts key={key} title={rail.title} items={rail.items} idSuffix={key} />
    ) : null;
  });
}
