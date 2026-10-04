"use client";
import { toPlainText } from "@/lib/richText";
import { useMemo, useState } from "react";
import Heading from "./Heading";
import Html from "../Html";

/**
 * `faq-categories` blueprint → Figma 339-2088 (FAQs page).
 *
 * Data: eyebrow, heading, emphasis, description, show_filters, open_first,
 * and `categories` — inlined by the backend's FaqInliner from the central
 * Content → FAQ dataset, shaped [{id, name, slug, description, items:[{id,
 * question, answer}]}]. Nothing is authored on the section itself, so the
 * same section can be dropped on any page in the page builder and always
 * shows the current FAQ content.
 *
 * One rounded panel per category (badge + accordion rows), with an optional
 * filter pill row above. Open state is tracked per category so every visible
 * panel can show its first answer at once, matching the design.
 */

/** Figma "plus" / "minus" 24px disclosure glyphs (2px round strokes). */
function DisclosureIcon({ open }) {
  return (
    <svg
      className="faq-cats__icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {open ? null : (
        <path
          d="M12 5V19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** Figma badge dot — 14px filled circle. */
function BadgeDot() {
  return (
    <svg
      className="faq-cats__dot"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="7" cy="7" r="7" fill="currentColor" />
    </svg>
  );
}

export default function FaqCategoriesSection({ section }) {
  const data = section.data ?? {};

  const categories = useMemo(
    () => (data.categories ?? []).filter((category) => category?.items?.length),
    [data.categories],
  );

  const openFirst = data.open_first !== false;

  const [activeSlug, setActiveSlug] = useState("all");
  // Per-category open row, so each visible panel keeps its own disclosure
  // state: { [categorySlug]: itemIndex | null }.
  const [openRows, setOpenRows] = useState({});

  if (!categories.length) {
    return null;
  }

  const visible =
    activeSlug === "all"
      ? categories
      : categories.filter((category) => category.slug === activeSlug);

  const openIndexFor = (category) =>
    category.slug in openRows ? openRows[category.slug] : openFirst ? 0 : null;

  const toggleRow = (slug, index) =>
    setOpenRows((current) => {
      const currentIndex = slug in current ? current[slug] : openFirst ? 0 : null;

      return { ...current, [slug]: currentIndex === index ? null : index };
    });

  const hasIntro = data.heading || data.eyebrow || data.description;

  return (
    <section
      id={section.anchor || "faqs"}
      className="faq-cats sx-section"
      aria-label={toPlainText(data.heading) || "Frequently asked questions"}
    >
      {/*
        Intro, filters and panels were three siblings of the <section>, two of
        which were individually named in the frame's $content-containers list.
        One column around all three carries the knob instead — see the note at
        the top of _faq-categories.scss.
      */}
      <div className="faq-cats__column sx-content">
        {hasIntro ? (
          <div className="faq-cats__intro">
            <Html as="p" inline className="faq-cats__eyebrow" value={data.eyebrow} />
            {data.heading ? (
              <Heading
                className="faq-cats__heading"
                heading={data.heading}
                emphasis={data.emphasis}
              />
            ) : null}
            <Html className="faq-cats__description" value={data.description} />
          </div>
        ) : null}

        {data.show_filters !== false && categories.length > 1 ? (
          <div className="faq-cats__filters" role="tablist" aria-label="FAQ categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeSlug === "all"}
              className={`faq-cats__pill${activeSlug === "all" ? " is-active" : ""}`}
              onClick={() => setActiveSlug("all")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                role="tab"
                aria-selected={activeSlug === category.slug}
                className={`faq-cats__pill${activeSlug === category.slug ? " is-active" : ""}`}
                onClick={() => setActiveSlug(category.slug)}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="faq-cats__panels">
          {visible.map((category) => {
            const openIndex = openIndexFor(category);

            return (
              <div className="faq-cats__panel" key={category.slug} id={`faq-${category.slug}`}>
                <div className="faq-cats__badge">
                  <BadgeDot />
                  <span>{category.name}</span>
                </div>

                {category.description ? (
                  <Html className="faq-cats__cat-description" value={category.description} />
                ) : null}

                <div className="faq-cats__list">
                  {category.items.map((item, index) => {
                    const isOpen = openIndex === index;
                    const panelId = `faq-${category.slug}-${item.id ?? index}`;

                    return (
                      <div
                        className={`faq-cats__row${isOpen ? " is-open" : ""}`}
                        key={item.id ?? index}
                      >
                        <button
                          type="button"
                          className="faq-cats__question"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggleRow(category.slug, index)}
                        >
                          <Html as="span" inline value={item.question} />
                          <DisclosureIcon open={isOpen} />
                        </button>
                        {isOpen ? (
                          <div className="faq-cats__answer" id={panelId} role="region">
                            <Html value={item.answer} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
