"use client";
import FilterWidgets from "./FilterWidgets";

/**
 * Theme `components/products/Sidebar.jsx` — desktop filter column content
 * (rendered inside `.canvas-sidebar` by the listing shell). Facet groups are
 * API-driven via FilterWidgets.
 */
export default function Sidebar({ widgetProps }) {
  return (
    <>
      {" "}
      <div className="canvas-header d-flex d-xl-none">
        <span className="title">Filter</span>
        <span className="icon-close icon-close-popup close-filter" />
      </div>
      <div className="canvas-body">
        <FilterWidgets {...widgetProps} idPrefix="sb" chipVariant="compound" />
      </div>
    </>
  );
}
