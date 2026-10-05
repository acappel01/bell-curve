"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { SORT_OPTIONS } from "@/components/catalog/query";
import useListingFilters from "@/components/catalog/useListingFilters";
import ProductCard from "./ProductCard";

/** BCH wording for the shared sort values; the values themselves are the API's. */
const SORT_LABELS = {
  "": "Featured",
  name: "Name, A to Z",
  "-name": "Name, Z to A",
  price: "Price, low to high",
  "-price": "Price, high to low",
};

const GROUP_LABELS = {
  goal: "Concern",
  category: "Category",
  price: "Price",
  availability: "Availability",
};

/**
 * The BCH listing shell: toolbar, filters, cards and pages.
 *
 * Markup only. What a filter does is `useListingFilters` (shared with the
 * Atlas listing): every control rewrites the URL and the server refetches.
 * With `filterable` false the same cards render as a fixed collection.
 */
export default function CatalogListing({ filterable, ...props }) {
  return filterable ? <FilterableListing {...props} /> : <Cards {...props} />;
}

function FilterableListing({ kind, items, meta, facets, options }) {
  const labels = { ...GROUP_LABELS, ...options.labels };
  const state = useListingFilters({ kind, facets, labels: { goal: labels.goal, category: labels.category, price: labels.price } });
  const drawer = useRef(null);
  const total = meta?.total ?? items.length;

  const groupProps = { kind, facets, groups: options.groups, labels, state };
  const groups = <FilterGroups {...groupProps} />;

  return (
    <div className={`bch-shop bch-shop--${options.filterStyle}`}>
      {options.kindTabs.length ? <KindTabs tabs={options.kindTabs} /> : null}

      <div className="bch-shop__toolbar">
        <button
          type="button"
          className="bch-shop__filter-btn"
          onClick={() => drawer.current?.showModal()}
          aria-haspopup="dialog"
        >
          <FilterIcon /> Filter
          {state.appliedTags.length ? <span className="bch-shop__filter-count">{state.appliedTags.length}</span> : null}
        </button>

        {options.filterStyle === "top" ? (
          <div className="bch-shop__topbar">
            {/* Closed dropdowns sharing a `name`, so opening one closes the other. */}
            <FilterGroups {...groupProps} dropdown />
          </div>
        ) : null}

        {options.showSearch ? <SearchBox value={state.filters.search} onSearch={(search) => state.updateParams({ search })} /> : null}

        {options.showCount ? (
          <p className="bch-shop__count" aria-live="polite">
            {total} {total === 1 ? "item" : "items"}
          </p>
        ) : null}

        {options.showSort ? (
          <label className="bch-shop__sort">
            <span className="bch-visually-hidden">Sort by</span>
            <select
              value={state.filters.sort}
              onChange={(event) => state.updateParams({ sort: event.target.value || null })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {SORT_LABELS[option.value] ?? option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {state.appliedTags.length ? (
        <div className="bch-shop__applied">
          {state.appliedTags.map((tag) => (
            <button key={tag.label} type="button" className="bch-chip bch-chip--on" onClick={() => state.updateParams(tag.clear)}>
              {tag.label}
              <span aria-hidden="true">×</span>
              <span className="bch-visually-hidden">, remove filter</span>
            </button>
          ))}
          <button type="button" className="bch-link bch-shop__clear" onClick={state.clearAll}>
            Clear all
          </button>
        </div>
      ) : null}

      <div className="bch-shop__body">
        {options.filterStyle === "sidebar" ? (
          <aside className="bch-shop__sidebar" aria-label="Filters">
            {groups}
          </aside>
        ) : null}
        <Cards kind={kind} items={items} meta={meta} options={options} pageHref={state.pageHref} />
      </div>

      <dialog ref={drawer} className="bch-drawer" aria-label="Filters">
        <div className="bch-drawer__head">
          <p className="bch-eyebrow">Filter</p>
          <button type="button" className="bch-drawer__close" onClick={() => drawer.current?.close()} aria-label="Close filters">
            ×
          </button>
        </div>
        <div className="bch-drawer__body">{groups}</div>
        <div className="bch-drawer__foot">
          <button type="button" className="bch-btn bch-btn--primary" onClick={() => drawer.current?.close()}>
            Show {total} {total === 1 ? "item" : "items"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

function Cards({ kind, items, meta, options, pageHref = null }) {
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  if (!items.length) {
    return <p className="bch-shop__empty">{options.emptyMessage}</p>;
  }

  return (
    <div className="bch-shop__results">
      <ul className={`bch-shop__grid bch-shop__grid--${options.layout} bch-shop__grid--cols-${options.columns}`}>
        {items.map((item) => (
          <li key={item.slug ?? item.id}>
            <ProductCard item={item} kind={kind} variant={options.layout === "rows" ? "row" : "tile"} />
          </li>
        ))}
      </ul>

      {pageHref && lastPage > 1 ? (
        <nav className="bch-pages" aria-label="Pages">
          {Array.from({ length: lastPage }, (_, index) => index + 1).map((page) =>
            page === currentPage ? (
              <span key={page} aria-current="page">
                {page}
              </span>
            ) : (
              <Link key={page} href={pageHref(page)} scroll={false}>
                {page}
              </Link>
            ),
          )}
        </nav>
      ) : null}
    </div>
  );
}

function FilterGroups({ kind, facets, groups, labels, state, dropdown = false }) {
  const countKey = kind === "package" ? "package_count" : "count";
  const list = (key, facetKey) => (facets?.[facetKey] ?? []).filter((row) => row[countKey] > 0);

  return groups.map((group) => {
    let body = null;

    if (group === "goal" || group === "category") {
      const rows = list(group, group === "goal" ? "goals" : "categories");
      if (!rows.length) return null;

      body = rows.map((row) => (
        <Option
          key={row.slug}
          label={row.name}
          count={row[countKey]}
          active={state.filters[group] === row.slug}
          onClick={() => state.onToggleFilter(group, row.slug)}
        />
      ));
    }

    if (group === "price") {
      const buckets = priceBuckets(state.priceBounds);
      if (!buckets.length) return null;

      body = buckets.map((bucket) => {
        const active =
          state.filters.price_min === (bucket.min !== null ? String(bucket.min) : "") &&
          state.filters.price_max === (bucket.max !== null ? String(bucket.max) : "");

        return (
          <Option
            key={bucket.label}
            label={bucket.label}
            active={active}
            onClick={() =>
              state.updateParams(
                active
                  ? { price_min: null, price_max: null }
                  : {
                      price_min: bucket.min !== null ? String(bucket.min) : null,
                      price_max: bucket.max !== null ? String(bucket.max) : null,
                    },
              )
            }
          />
        );
      });
    }

    if (group === "availability") {
      if (kind === "package" || !facets?.availability) return null;

      body = (
        <Option
          label="In stock only"
          active={state.filters.in_stock === "1"}
          onClick={() => state.updateParams({ in_stock: state.filters.in_stock === "1" ? null : "1" })}
        />
      );
    }

    if (!body) {
      return null;
    }

    return (
      <details key={group} className="bch-fgroup" open={!dropdown} name={dropdown ? "bch-shop-filters" : undefined}>
        <summary>{labels[group] ?? GROUP_LABELS[group]}</summary>
        <div className="bch-fgroup__body">{body}</div>
      </details>
    );
  });
}

function Option({ label, count = null, active, onClick }) {
  return (
    <button type="button" className="bch-fopt" aria-pressed={active} onClick={onClick}>
      <span className="bch-fopt__box" aria-hidden="true" />
      <span className="bch-fopt__label">{label}</span>
      {count !== null ? <span className="bch-fopt__count">{count}</span> : null}
    </button>
  );
}

function KindTabs({ tabs }) {
  const pathname = usePathname();

  return (
    <nav className="bch-shop__tabs" aria-label="Shop by type">
      {tabs.map((tab) => (
        <Link key={tab.url} href={tab.url} className="bch-chip" aria-current={pathname === tab.url ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function SearchBox({ value, onSearch }) {
  return (
    <form
      className="bch-shop__search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(new FormData(event.currentTarget).get("search")?.toString().trim() || null);
      }}
    >
      <label>
        <span className="bch-visually-hidden">Search the shop</span>
        <input name="search" type="search" defaultValue={value} placeholder="Search" />
      </label>
    </form>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Up to three price ranges from the facet bounds, on round numbers, so the
 * price filter is three taps rather than a slider on a phone.
 */
function priceBuckets(bounds) {
  if (!bounds || bounds.max == null || bounds.min == null || bounds.max <= bounds.min) {
    return [];
  }

  const span = bounds.max - bounds.min;
  const step = span > 200 ? 50 : span > 60 ? 25 : 10;
  const cut = (fraction) => Math.max(step, Math.round((bounds.min + span * fraction) / step) * step);
  const low = cut(1 / 3);
  const high = Math.max(cut(2 / 3), low + step);

  return [
    { label: `Under $${low}`, min: null, max: low },
    { label: `$${low} to $${high}`, min: low, max: high },
    { label: `$${high} and up`, min: high, max: null },
  ];
}
