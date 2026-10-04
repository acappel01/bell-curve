"use client";
import Html from "../Html";
import { useState } from "react";
import Heading from "./Heading";

/**
 * `faq` blueprint → theme "Faq" accordion (faq-*). Data: eyebrow, heading,
 * emphasis, description, cta_label, cta_url, image, image_alt, faqs[{q, a}].
 * Accordion open state is React-owned (single open item, like the theme) —
 * no Bootstrap collapse dependency.
 *
 * Known backend gap (tracked): no link to the central /faq dataset yet.
 */
export default function FaqSection({ section }) {
  const data = section.data ?? {};
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id={section.anchor || "faqs"} className="faq-section sx-section" aria-labelledby="faq-heading">
      <div className="faq-inner sx-content">
        <div className="faq-introduction">
          <Heading
            className="faq-heading"
            heading={data.heading}
            emphasis={data.emphasis}
          />
          {data.description ? (
            <Html className="faq-description" value={data.description} />
          ) : (
            <Html as="p" inline className="faq-description" value={data.eyebrow} />
          )}
          {data.cta_label ? (
            <a className="ps-cardButton" href={data.cta_url || "#"}>
              {data.cta_label}
            </a>
          ) : null}
          {data.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            // The 50% layout width and the offset that goes with it are in
            // _faq.scss, not here — `width="50%"` is not a valid HTML width
            // attribute (it takes a pixel count) and only worked because
            // browsers map it to a presentational hint.
            <img
              className="faq-image lazyload"
              src={data.image.url}
              alt={data.image_alt || data.image.alt || ""}
            />
          ) : null}
        </div>

        <div className="faq-wrap" id="faqaccordian">
          {(data.faqs ?? []).map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div className="widget-accordion" key={index}>
                <div
                  className={`accordion-title${isOpen ? " show" : ""}`}
                  role="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-collapse-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <Html as="span" inline value={faq.q} />
                  <span className="icon icon-arrow-down" />
                </div>
                <div
                  id={`faq-collapse-${index}`}
                  className={`accordion-collapse collapse${isOpen ? " show" : ""}`}
                >
                  <div className="accordion-body">
                    <Html value={faq.a} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
