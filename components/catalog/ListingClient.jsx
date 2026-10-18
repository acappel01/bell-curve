"use client";

import Link from "next/link";
import { useState } from "react";
import LayoutHandler from "./LayoutHandler";
import Sidebar from "./Sidebar";
import FilterModal from "./FilterModal";
import { PackageListingCard, ProductListingCard } from "./cards";
import { SORT_OPTIONS, sortLabel } from "./query";
import useListingFilters from "./useListingFilters";

/**
 * Client shell for the catalog listing pages — a port of theme-reference
 * `components/products/Products2.jsx` (shop control bar, applied-filter tags,
 * desktop sidebar, mobile #filterShop offcanvas, grid/list layouts,
 * pagination).
 *
 * All filter state lives in the URL (see `useListingFilters`, shared with the
 * Bell Curve listing): widgets rewrite the query params and the parent server
 * component refetches from the API. Markup and classNames are the theme's.
 */
export default function ListingClient({ kind, items, meta, facets }) {
  const [activeLayout, setActiveLayout] = useState(3);

  const {
    filters,
    price,
    appliedTags,
    updateParams,
    clearAll,
    pageHref,
    onPriceChange,
    onPriceCommit,
    onToggleFilter,
    onSetAvailability,
  } = useListingFilters({ kind, facets });

  const widgetProps = {
    kind,
    facets,
    filters,
    price,
    onPriceChange,
    onPriceCommit,
    onToggleFilter,
    onSetAvailability,
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
