"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { REGULATORY_OPTIONS, SORT_OPTIONS } from "./query";

/**
 * The knowledge-base filter bar.
 *
 * A client component because it writes the URL — nothing more. Filter state
 * lives in `searchParams`, the server component re-renders from it, and there
 * is no client-side fetching, the same contract the catalog listings follow.
 *
 * The search box is a real `<form>` so Enter submits and the control works
 * before hydration; the selects call `router.replace` on change. Every
 * mutation drops `page`, because narrowing the results while on page 4 lands
 * on a page that no longer exists and reads as "no matches".
 */
export default function KbFilters({ total }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(urlSearch);

  // Resync when the URL changes underneath the input — a back navigation, or
  // the "clear filters" link. Without this the box keeps a term the results
  // no longer reflect.
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const apply = (mutations) => {
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

  const showingAll = searchParams.get("all") === "1";
  const hasFilters = ["search", "status", "sort", "all"].some((key) => searchParams.get(key));

  return (
    <div className="kb-filters">
      <form
        className="kb-filters__search"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ search: search.trim() });
        }}
        role="search"
      >
        <label className="kb-filters__label" htmlFor="kb-search">
          Search
        </label>
        <input
          id="kb-search"
          name="search"
          type="search"
          className="kb-filters__input"
          placeholder="Compound, brand or synonym"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit" className="kb-filters__submit">
          Search
        </button>
      </form>

      <div className="kb-filters__controls">
        <div className="kb-filters__control">
          <label className="kb-filters__label" htmlFor="kb-status">
            Regulatory status
          </label>
          <select
            id="kb-status"
            className="kb-filters__select"
            value={searchParams.get("status") ?? ""}
            onChange={(event) => apply({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {REGULATORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="kb-filters__control">
          <label className="kb-filters__label" htmlFor="kb-sort">
            Sort
          </label>
          <select
            id="kb-sort"
            className="kb-filters__select"
            value={searchParams.get("sort") ?? "name"}
            onChange={(event) => apply({ sort: event.target.value === "name" ? null : event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="kb-filters__toggle">
          <input
            type="checkbox"
            checked={showingAll}
            onChange={(event) => apply({ all: event.target.checked ? "1" : null })}
          />
          <span>Include non-peptide compounds</span>
        </label>
      </div>

      <div className="kb-filters__meta">
        <span>
          {total} {total === 1 ? "compound" : "compounds"}
        </span>
        {hasFilters ? (
          <button
            type="button"
            className="kb-filters__clear"
            onClick={() => router.replace(pathname, { scroll: false })}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
