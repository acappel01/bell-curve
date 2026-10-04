"use client";
import FilterWidgets from "./FilterWidgets";

/**
 * Theme `components/products/FilterModal.jsx` — the #filterShop offcanvas
 * opened by the mobile "Filter" button in the shop control bar. The theme's
 * static demo blocks (color swatches, brand list, "On sale" products, banner)
 * are replaced by the same API-driven facet groups as the sidebar.
 */
export default function FilterModal({ widgetProps }) {
  return (
    <div className="offcanvas offcanvas-start canvas-sidebar canvas-filter" id="filterShop">
      <div className="canvas-wrapper">
        <div className="canvas-header">
          <span className="title">Filter</span>
          <button
            className="icon-close icon-close-popup"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="canvas-body">
          <FilterWidgets {...widgetProps} idPrefix="fm" chipVariant="size" />
        </div>
      </div>
    </div>
  );
}
