/**
 * Absolute URLs and structured data.
 *
 * This app had neither before the knowledge base. Catalog and CMS pages emit
 * relative metadata and no JSON-LD at all, which is survivable for a shop and
 * is not for health content: a monograph's value to a search engine is almost
 * entirely in who reviewed it and when, and there is no way to say that in
 * prose alone.
 *
 * Everything here runs server-side only. `SITE_URL` is read at request time
 * rather than baked into the client bundle, so it is a plain env var and not a
 * NEXT_PUBLIC_ one.
 */

import { toPlainText } from "@/lib/richText";
import { KB_BASE_PATH } from "@/lib/routes";

/**
 * The public origin this site is served from, with no trailing slash.
 *
 * Deliberately NOT taken from the API. A canonical URL is a claim about where
 * this deployment lives, and the app has to be able to make it while the API
 * is unreachable — and an operator editing a settings field should never be
 * able to point every canonical on the site at someone else's domain.
 *
 * Returns null when unset, and every caller treats that as "emit no canonical"
 * rather than guessing: a canonical pointing at the wrong origin is worse than
 * none, because it hands the ranking to that origin.
 */
export function siteUrl() {
  const raw = process.env.SITE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

/** Absolute URL for a site-relative path, or null when SITE_URL is unset. */
export function absoluteUrl(path = "/") {
  const base = siteUrl();
  if (!base) {
    return null;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * `alternates.canonical` for a page, or undefined when no origin is
 * configured. Spread into a metadata object.
 */
export function canonical(path) {
  const url = absoluteUrl(path);
  return url ? { alternates: { canonical: url } } : {};
}

/** Trims plain text to a whole word, for a field with a practical size limit. */
function clamp(value, limit) {
  const text = toPlainText(value);
  if (!text) {
    return undefined;
  }
  if (text.length <= limit) {
    return text;
  }
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.]$/, "")}…`;
}

/**
 * Schema.org for one monograph: a MedicalWebPage wrapping a Drug.
 *
 * Be clear-eyed about the payoff. Google's rich-results gallery lists no
 * medical types, so this buys entity understanding and grounding in AI
 * answers, not a decorated search result. What it does buy is worth having:
 * `lastReviewed` and `reviewedBy` are the machine-readable form of the single
 * biggest trust signal health content has.
 *
 * `legalStatus` is emitted for every compound that has one. For a research
 * peptide, saying so explicitly is more honest than describing it as a bare
 * Substance and letting the reader infer, and it is the same claim the visible
 * page makes — structured data that contradicts the page is a penalty, not a
 * shortcut.
 */
export function compoundJsonLd(compound) {
  if (!compound?.slug) {
    return null;
  }

  const url = absoluteUrl(`${KB_BASE_PATH}/${compound.slug}`);
  const monograph = compound.monograph ?? {};
  const regulatory = compound.regulatory ?? null;

  const alternateNames = [...(compound.brand_names ?? []), ...(compound.synonyms ?? [])]
    .map((name) => String(name).trim())
    .filter(Boolean);

  const drug = {
    "@type": "Drug",
    name: compound.name,
    ...(alternateNames.length ? { alternateName: [...new Set(alternateNames)] } : {}),
    ...(clamp(compound.description, 500) ? { description: clamp(compound.description, 500) } : {}),
    ...(clamp(monograph.mechanism_of_action, 1500)
      ? { mechanismOfAction: clamp(monograph.mechanism_of_action, 1500) }
      : {}),
    ...(compound.route_of_administration
      ? { administrationRoute: compound.route_of_administration }
      : {}),
    ...(regulatory ? { legalStatus: regulatory.label } : {}),
    // The warning is the not-approved statement, and only when it is true.
    // Attaching one unconditionally would put a scare on an approved drug and
    // devalue it where it matters.
    ...(regulatory && !regulatory.is_approved_for_human_use
      ? { warning: regulatory.description }
      : {}),
  };

  const reviewer = compound.reviewed_by ?? null;

  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    ...(url ? { "@id": url, url } : {}),
    name: compound.name,
    ...(clamp(compound.description, 300) ? { description: clamp(compound.description, 300) } : {}),
    ...(compound.reviewed_at ? { lastReviewed: compound.reviewed_at } : {}),
    ...(reviewer?.name
      ? {
          reviewedBy: {
            "@type": "Person",
            name: reviewer.name,
            ...(reviewer.credentials ? { honorificSuffix: reviewer.credentials } : {}),
            ...(reviewer.title ? { jobTitle: reviewer.title } : {}),
          },
        }
      : {}),
    // The page is written for the person considering the compound, not for a
    // prescriber. Saying so keeps the structured data honest about a KB whose
    // source prose was drafted for clinicians and is being rewritten toward
    // the reader.
    medicalAudience: "Patient",
    mainEntity: drug,
  };
}

/** Schema.org for the knowledge-base index. */
export function kbIndexJsonLd({ name, description, items = [] }) {
  const url = absoluteUrl(KB_BASE_PATH);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    ...(url ? { "@id": url, url } : {}),
    name,
    ...(description ? { description } : {}),
    ...(items.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: items.length,
            itemListElement: items
              .map((item, index) => {
                const itemUrl = absoluteUrl(`${KB_BASE_PATH}/${item.slug}`);
                return itemUrl
                  ? { "@type": "ListItem", position: index + 1, name: item.name, url: itemUrl }
                  : null;
              })
              .filter(Boolean),
          },
        }
      : {}),
  };
}
