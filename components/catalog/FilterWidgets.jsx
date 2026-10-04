"use client";
import Slider from "rc-slider";

/**
 * Facet widget groups shared by the desktop Sidebar and the mobile
 * FilterModal offcanvas. Markup is ported from theme-reference
 * `components/products/Sidebar.jsx` / `FilterModal.jsx`; option lists,
 * counts and price bounds come from /api/v1/catalog/facets instead of the
 * theme's static demo data. Only groups with entries render.
 *
 * `idPrefix` namespaces the Bootstrap collapse targets — the theme reuses
 * the same ids (#availability, #price) in both the sidebar and the modal,
 * which breaks collapse toggling once both are mounted.
 *
 * `chipVariant` mirrors the theme's two chip treatments for the Compound
 * group: "compound" (Sidebar.jsx) vs "size" (FilterModal.jsx).
 */
export default function FilterWidgets({
  kind,
  facets,
  filters,
  price,
  onPriceChange,
  onPriceCommit,
  onToggleFilter,
  onSetAvailability,
  idPrefix,
  chipVariant = "compound",
}) {
  // Packages carry no classification, and /catalog/packages rejects these params.
  const withClassification = kind === "product";
  const priceBounds = facets?.price ?? null;
  const availability = facets?.availability ?? null;

  /** widget-facet collapse header, shared by every group. */
  const facetTitle = (label, target) => (
    <div
      className="facet-title text-xl fw-medium"
      data-bs-target={`#${target}`}
      role="button"
      data-bs-toggle="collapse"
      aria-expanded="true"
      aria-controls={target}
    >
      <span>{label}</span>
      <span className="icon icon-arrow-up" />
    </div>
  );

  /** Radio-check facet group (theme FilterModal "Brand" markup). */
  const checkGroup = (label, key, options) => {
    if (!options?.length) {
      return null;
    }
    const target = `${idPrefix}-${key}`;

    return (
      <div className="widget-facet">
        {facetTitle(label, target)}
        <div id={target} className="collapse show">
          <ul className="collapse-body filter-group-check current-scrollbar">
            {options.map((option) => (
              <li
                key={option.slug}
                className="list-item"
                onClick={() => onToggleFilter(key, option.slug)}
              >
                <input
                  type="radio"
                  className="tf-check"
                  readOnly
                  checked={filters[key] === option.slug}
                />
                <label className="label">
                  <span>{option.name}</span>&nbsp;
                  <span className="count">({option.count})</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  /**
   * The count that matters on THIS listing, and whether the option is worth
   * offering at all.
   *
   * One facets endpoint serves both listings, so every row carries a product
   * count and a package count. Reading the wrong one offers a filter that
   * leads to an empty page — which is exactly what the stacks listing did when
   * goal options were counted by products: ten options, every one returning
   * nothing.
   */
  const facetCount = (row) => (kind === "package" ? (row.package_count ?? 0) : (row.count ?? 0));
  const liveFacets = (rows) => (rows ?? []).filter((row) => facetCount(row) > 0);

  const goalTarget = `${idPrefix}-goal`;
  const categoryTarget = `${idPrefix}-category`;
  const availabilityTarget = `${idPrefix}-availability`;
  const priceTarget = `${idPrefix}-price`;
  const compoundTarget = `${idPrefix}-compound`;

  return (
    <>
      {/* Health goals first: it is the group with options in it on a typical
          install, and leading with an empty Category group reads as broken. */}
      {liveFacets(facets?.goals).length ? (
        <div className="widget-facet">
          {facetTitle("Health Goal", goalTarget)}
          <div id={goalTarget} className="collapse show">
            <ul className="collapse-body list-categories current-scrollbar">
              {liveFacets(facets.goals).map((goal) => (
                <li key={goal.slug} className="cate-item">
                  <a
                    className={`text-sm link ${
                      filters.goal === goal.slug ? "fw-medium" : ""
                    }`}
                    href={`?goal=${encodeURIComponent(goal.slug)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onToggleFilter("goal", goal.slug);
                    }}
                  >
                    <span>{goal.name}</span> <span className="count">({facetCount(goal)})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {liveFacets(facets?.categories).length ? (
        <div className="widget-facet">
          {facetTitle("Category", categoryTarget)}
          <div id={categoryTarget} className="collapse show">
            <ul className="collapse-body list-categories current-scrollbar">
              {liveFacets(facets.categories).map((category) => (
                <li key={category.slug} className="cate-item">
                  <a
                    className={`text-sm link ${
                      filters.category === category.slug ? "fw-medium" : ""
                    }`}
                    href={`?category=${encodeURIComponent(category.slug)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onToggleFilter("category", category.slug);
                    }}
                  >
                    <span>{category.name}</span> <span className="count">({facetCount(category)})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {availability ? (
        <div className="widget-facet">
          {facetTitle("Availability", availabilityTarget)}
          <div id={availabilityTarget} className="collapse show">
            <ul className="collapse-body filter-group-check current-scrollbar">
              <li className="list-item" onClick={() => onSetAvailability(true)}>
                <input
                  type="radio"
                  className="tf-check"
                  readOnly
                  checked={filters.in_stock === "1"}
                />
                <label className="label">
                  <span>In stock</span>&nbsp;
                  <span className="count">({availability.in_stock ?? 0})</span>
                </label>
              </li>
              <li className="list-item" onClick={() => onSetAvailability(false)}>
                <input
                  type="radio"
                  className="tf-check"
                  readOnly
                  checked={filters.in_stock === "0"}
                />
                <label className="label">
                  <span>Out of stock</span>&nbsp;
                  <span className="count">({availability.out_of_stock ?? 0})</span>
                </label>
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {priceBounds && priceBounds.max > priceBounds.min ? (
        <div className="widget-facet">
          {facetTitle("Price", priceTarget)}
          <div id={priceTarget} className="collapse show">
            <div className="collapse-body widget-price filter-price">
              <div
                className="price-val-range"
                id={`${idPrefix}-price-value-range`}
                data-min={priceBounds.min}
                data-max={priceBounds.max}
              >
                <Slider
                  value={price}
                  onChange={onPriceChange}
                  onChangeComplete={onPriceCommit}
                  range
                  min={priceBounds.min}
                  max={priceBounds.max}
                />
              </div>
              <div className="box-value-price">
                <span className="text-sm">Price:</span>
                <div className="price-box">
                  <div className="price-val" data-currency="$">
                    {price[0]}
                  </div>
                  <span>-</span>
                  <div className="price-val" data-currency="$">
                    {price[1]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {withClassification ? checkGroup("Class", "class", facets?.classes) : null}
      {withClassification ? checkGroup("Type", "type", facets?.types) : null}
      {withClassification ? checkGroup("Form", "form", facets?.forms) : null}

      {withClassification && facets?.ingredients?.length ? (
        <div className="widget-facet">
          {facetTitle("Compound", compoundTarget)}
          <div id={compoundTarget} className="collapse show">
            <div
              className={`collapse-body ${
                chipVariant === "size" ? "filter-size-box" : "filter-compound-box"
              } flat-check-list`}
            >
              {facets.ingredients.map((item) => (
                <div
                  key={item.slug}
                  onClick={() => onToggleFilter("ingredient", item.slug)}
                  className={`check-item ${
                    chipVariant === "size" ? "size-item size-check" : "compound-item compound-check"
                  } ${item.slug === filters.ingredient ? "active" : ""} `}
                >
                  <span className={chipVariant === "size" ? "size" : "compound"}>{item.name}</span>
                  &nbsp;
                  <span className="count">({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
