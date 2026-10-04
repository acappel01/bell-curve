"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LayoutHandler from "./LayoutHandler";
import Sidebar from "./Sidebar";
import FilterModal from "./FilterModal";
import { PackageListingCard, ProductListingCard } from "./cards";
import { SORT_OPTIONS, slugFilterKeys, sortLabel } from "./query";

/**
 * Client shell for the catalog listing pages — a port of theme-reference
 * `components/products/Products2.jsx` (shop control bar, applied-filter tags,
 * desktop sidebar, mobile #filterShop offcanvas, grid/list layouts,
 * pagination).
 *
 * All filter state lives in the URL: widgets call router.replace with new
 * query params and the parent server component refetches from the API. The
 * theme's in-memory reducer filtering over demo data is replaced by that
 * round trip; markup and classNames are unchanged.
 */
export default function ListingClient({ kind, items, meta, facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeLayout, setActiveLayout] = useState(3);

  const priceBounds = facets?.price ?? null;
  const defaultPrice = useMemo(
    () => [priceBounds?.min ?? 0, priceBounds?.max ?? 0],
    [priceBounds],
  );

  const filters = useMemo(() => {
    const value = {};
    for (const key of [...slugFilterKeys(kind), "in_stock", "price_min", "price_max", "sort"]) {
      value[key] = searchParams.get(key) ?? "";
    }
    return value;
  }, [searchParams, kind]);

  const urlPrice = [
    filters.price_min !== "" ? Number(filters.price_min) : defaultPrice[0],
    filters.price_max !== "" ? Number(filters.price_max) : defaultPrice[1],
  ];

  // Slider position while dragging; committed to the URL on release.
  const [price, setPrice] = useState(urlPrice);
  useEffect(() => {
    setPrice(urlPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync when the URL-derived range changes
  }, [filters.price_min, filters.price_max, defaultPrice[0], defaultPrice[1]]);

  /** Apply query-param mutations ({key: value|null}) and reset pagination. */
  const updateParams = (mutations) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(mutations)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const priceActive =
    priceBounds && (filters.price_min !== "" || filters.price_max !== "");

  const widgetProps = {
    kind,
    facets,
    filters,
    price,
    onPriceChange: (value) => setPrice(value),
    onPriceCommit: (value) =>
      updateParams({
        price_min: value[0] > defaultPrice[0] ? String(value[0]) : null,
        price_max: value[1] < defaultPrice[1] ? String(value[1]) : null,
      }),
    onToggleFilter: (key, slug) =>
      updateParams({ [key]: filters[key] === slug ? null : slug }),
    onSetAvailability: (inStock) => updateParams({ in_stock: inStock ? "1" : "0" }),
  };

  /** Facet display name for an applied-filter tag. */
  const facetName = (list, slug) => list?.find((item) => item.slug === slug)?.name ?? slug;

  const appliedTags = [
    filters.in_stock !== "" && {
      label: `Availability: ${filters.in_stock === "1" ? "In Stock" : "Unavailable"}`,
      clear: { in_stock: null },
    },
    // Goal leads the sidebar, so it needs a chip like every other slug filter.
    // Without one, filtering by goal alone left the whole meta bar absent: no
    // result count, no removable chip, no "Clear all filter".
    filters.goal && {
      label: `Health Goal: ${facetName(facets?.goals, filters.goal)}`,
      clear: { goal: null },
    },
    filters.category && {
      label: `Category: ${facetName(facets?.categories, filters.category)}`,
      clear: { category: null },
    },
    filters.class && {
      label: `Class: ${facetName(facets?.classes, filters.class)}`,
      clear: { class: null },
    },
    filters.type && {
      label: `Type: ${facetName(facets?.types, filters.type)}`,
      clear: { type: null },
    },
    filters.form && {
      label: `Form: ${facetName(facets?.forms, filters.form)}`,
      clear: { form: null },
    },
    filters.ingredient && {
      label: `Compound: ${facetName(facets?.ingredients, filters.ingredient)}`,
      clear: { ingredient: null },
    },
    filters.tag && {
      label: `Tag: ${facetName(facets?.tags, filters.tag)}`,
      clear: { tag: null },
    },
    priceActive && {
      label: `Price: $${price[0]} - $${price[1]}`,
      clear: { price_min: null, price_max: null },
    },
  ].filter(Boolean);

  const clearAll = () => {
    const mutations = { in_stock: null, price_min: null, price_max: null };
    for (const key of slugFilterKeys(kind)) {
      mutations[key] = null;
    }
    updateParams(mutations);
  };

  /** Pagination href for a page number, preserving the current filters. */
  const pageHref = (page) => {
    const next = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      next.set("page", String(page));
    } else {
      next.delete("page");
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? items.length;

  const pagination =
    lastPage > 1 ? (
      <ul className="wg-pagination">
        {Array.from({ length: lastPage }, (_, index) => index + 1).map((page) =>
          page === currentPage ? (
            <li className="active" key={page}>
              <div className="pagination-item">{page}</div>
            </li>
          ) : (
            <li key={page}>
              <Link href={pageHref(page)} className="pagination-item">
                {page}
              </Link>
            </li>
          ),
        )}
        {currentPage < lastPage ? (
          <li>
            <Link href={pageHref(currentPage + 1)} className="pagination-item">
              <i className="icon-arr-right2" />
            </Link>
          </li>
        ) : null}
      </ul>
    ) : null;

  const cards = items.map((item) =>
    kind === "product" ? (
      <ProductListingCard key={item.slug ?? item.id} product={item} />
    ) : (
      <PackageListingCard key={item.slug ?? item.id} pkg={item} />
    ),
  );

  const emptyState = !items.length ? (
    <div className="text-center" style={{ padding: "48px 0" }}>
      <p className="text-md">No results match the selected filters.</p>
    </div>
  ) : null;

  return (
    <section className="flat-spacing-24">
      <div className="container">
        <div className="row">
          <div className="col-xl-3">
            <div className="canvas-sidebar sidebar-filter canvas-filter left">
              <div className="canvas-wrapper">
                <Sidebar widgetProps={widgetProps} />
              </div>
            </div>
          </div>
          <div className="col-xl-9">
            <div className="tf-shop-control">
              <div className="tf-group-filter">
                <a
                  href="#filterShop"
                  data-bs-toggle="offcanvas"
                  aria-controls="filterShop"
                  className="tf-btn-filter d-flex d-xl-none"
                >
                  <span className="icon icon-filter" />
                  <span className="text">Filter</span>
                </a>
                <div className="tf-dropdown-sort" data-bs-toggle="dropdown">
                  <div className="btn-select">
                    <span className="text-sort-value">{sortLabel(filters.sort)}</span>
                    <span className="icon icon-arr-down" />
                  </div>
                  <div className="dropdown-menu">
                    {SORT_OPTIONS.map((option) => (
                      <div
                        key={option.label}
                        className={`select-item ${
                          (filters.sort || "") === option.value ? "active" : ""
                        }`}
                        onClick={() => updateParams({ sort: option.value || null })}
                        data-sort-value={option.value || "default"}
                      >
                        <span className="text-value-item">{option.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <ul className="tf-control-layout">
                <LayoutHandler setActiveLayout={setActiveLayout} activeLayout={activeLayout} />
              </ul>
            </div>
            <div className="wrapper-control-shop">
              {appliedTags.length ? (
                <div className="meta-filter-shop" style={{}}>
                  <div id="product-count-grid" className="count-text">
                    <span className="count">{total}</span>Product
                    {total > 1 ? "s" : ""} found
                  </div>

                  <div id="applied-filters">
                    {appliedTags.map((tag) => (
                      <span
                        key={tag.label}
                        className="filter-tag"
                        onClick={() => updateParams(tag.clear)}
                      >
                        <span className="remove-tag icon-close"></span> {tag.label}
                      </span>
                    ))}
                  </div>
                  <button id="remove-all" className="remove-all-filters" onClick={clearAll}>
                    <i className="icon icon-close" /> Clear all filter
                  </button>
                </div>
              ) : null}
              {activeLayout == 1 ? (
                <div className="tf-list-layout wrapper-shop" id="listLayout">
                  {cards}
                  {emptyState}
                  {pagination}
                </div>
              ) : (
                <div
                  // ONE COLUMN ON PHONES, and the layout switcher takes over
                  // from 768px up. `tf-col-N` is the theme's BASE, not its
                  // desktop, class — `sm-col-*` / `md-col-*` override upward —
                  // so putting the chosen layout in the base slot made the
                  // grid two- or three-up at 390px, where a card is 173px and
                  // its contents have nowhere to go. The switcher only appears
                  // on wide viewports anyway, so honouring it below md was
                  // giving weight to a control the phone visitor never saw.
                  className={`wrapper-shop tf-grid-layout tf-col-1 sm-col-2 md-col-${activeLayout}`}
                  id="gridLayout"
                >
                  {cards}
                  {emptyState}
                  {pagination}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <FilterModal widgetProps={widgetProps} />
    </section>
  );
}
