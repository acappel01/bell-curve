"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { slugFilterKeys } from "./query";

/**
 * Filter facets an applied-filter chip can name, in display order, with the
 * facets key that holds their option names.
 */
const CHIP_FACETS = [
  ["goal", "goals", "Health Goal"],
  ["category", "categories", "Category"],
  ["class", "classes", "Class"],
  ["type", "types", "Type"],
  ["form", "forms", "Form"],
  ["ingredient", "ingredients", "Compound"],
  ["tag", "tags", "Tag"],
];

/**
 * The URL-as-state half of a catalog listing, shared by every listing skin.
 *
 * Extracted from the Atlas `ListingClient` when the Bell Curve template needed
 * the same listing behind different markup. Filters, sort, price and page all
 * live in the query string, so a filtered view is a shareable, server-rendered
 * URL: this hook only ever rewrites the URL and the server component above
 * refetches. A skin owns markup and nothing else, which is what keeps two
 * templates from disagreeing about what a filter does.
 *
 * `labels` lets a skin rename chip prefixes ("Concern" instead of "Health
 * Goal") without re-implementing the chip list.
 */
export default function useListingFilters({ kind, facets, labels = {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const priceBounds = facets?.price ?? null;
  const defaultPrice = useMemo(
    () => [priceBounds?.min ?? 0, priceBounds?.max ?? 0],
    [priceBounds],
  );

  const filters = useMemo(() => {
    const value = {};
    for (const key of [...slugFilterKeys(kind), "in_stock", "price_min", "price_max", "sort", "search"]) {
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

  const priceActive = Boolean(priceBounds) && (filters.price_min !== "" || filters.price_max !== "");

  /** Facet display name for an applied-filter tag. */
  const facetName = (list, slug) => list?.find((item) => item.slug === slug)?.name ?? slug;

  const appliedTags = [
    filters.in_stock !== "" && {
      label: `${labels.in_stock ?? "Availability"}: ${filters.in_stock === "1" ? "In Stock" : "Unavailable"}`,
      clear: { in_stock: null },
    },
    ...CHIP_FACETS.map(
      ([key, facetKey, prefix]) =>
        filters[key] && {
          label: `${labels[key] ?? prefix}: ${facetName(facets?.[facetKey], filters[key])}`,
          clear: { [key]: null },
        },
    ),
    filters.search && {
      label: `${labels.search ?? "Search"}: “${filters.search}”`,
      clear: { search: null },
    },
    priceActive && {
      label: `${labels.price ?? "Price"}: $${price[0]} - $${price[1]}`,
      clear: { price_min: null, price_max: null },
    },
  ].filter(Boolean);

  const clearAll = () => {
    const mutations = { in_stock: null, price_min: null, price_max: null, search: null };
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

  return {
    filters,
    price,
    priceBounds,
    defaultPrice,
    appliedTags,
    updateParams,
    clearAll,
    pageHref,
    onPriceChange: (value) => setPrice(value),
    onPriceCommit: (value) =>
      updateParams({
        price_min: value[0] > defaultPrice[0] ? String(value[0]) : null,
        price_max: value[1] < defaultPrice[1] ? String(value[1]) : null,
      }),
    onToggleFilter: (key, slug) => updateParams({ [key]: filters[key] === slug ? null : slug }),
    onSetAvailability: (inStock) => updateParams({ in_stock: inStock ? "1" : "0" }),
  };
}
