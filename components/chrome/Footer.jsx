"use client";
import Link from "next/link";
import { useEffect } from "react";
import { menuLinkHref } from "@/lib/routes";

/**
 * Site footer (port of theme Footer4): brand block + one column per menu
 * mounted in the backend's `footer` region, © line from brand name.
 *
 * `sections` is ALREADY-RENDERED JSX, not data. Global blocks an operator
 * mounted in the footer region are rendered by SectionRenderer in the server
 * shell and handed down, because this component is a client boundary and
 * importing the section registry through it would drag every section
 * component to the browser. They sit above the copyright line, which is
 * where a site-wide legal disclaimer belongs — authored once as a global
 * block, shown on every page the template renders.
 * The mobile accordion (tap a column heading to expand) is the theme's
 * behavior, kept client-side; on desktop columns are always open via CSS.
 */
export default function Footer({ brand, menus, sections = null }) {
  useEffect(() => {
    const headings = document.querySelectorAll(".footer-heading-mobile");

    const toggleOpen = (event) => {
      const parent = event.target.closest(".footer-col-block");
      const content = parent.querySelector(".tf-collapse-content");

      if (parent.classList.contains("open")) {
        parent.classList.remove("open");
        content.style.height = "0px";
      } else {
        parent.classList.add("open");
        content.style.height = content.scrollHeight + 10 + "px";
      }
    };

    headings.forEach((heading) => heading.addEventListener("click", toggleOpen));

    return () => {
      headings.forEach((heading) => heading.removeEventListener("click", toggleOpen));
    };
  }, []);

  return (
    <footer id="footer" className="footer-default xl-pb-70">
      <div className="footer-body line-top">
        <div className="container">
          <div className="row-footer">
            <div className="footer-col-block s1 border-0">
              <div className="footer-logo mb_32">
                <Link href="/">
                  {brand?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="logo" alt={brand?.name || "logo"} src={brand.logo_url} height={33} />
                  ) : (
                    <strong className="logo">{brand?.name || ""}</strong>
                  )}
                </Link>
              </div>
              {brand?.tagline ? (
                <div className="tf-collapse-content">
                  <div className="footer-contact">
                    <h5>{brand.tagline}</h5>
                  </div>
                </div>
              ) : null}
            </div>
            {(menus ?? []).map((menu) => (
              <div key={menu.slug} className="footer-inner-wrap s3 border-0 mb_20">
                <div className="footer-col-block inner-col">
                  <div className="footer-heading footer-heading-mobile text-xl fw-bold font-3">
                    {menu.name}
                  </div>
                  <div className="tf-collapse-content">
                    <ul className="footer-menu-list">
                      {menu.items.map((item) => (
                        <li key={item.id}>
                          <Link href={menuLinkHref(item.link)} target={item.target || undefined}>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {sections ? <div className="footer-sections">{sections}</div> : null}
      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-wrap">
            <p className="text-dark">
              Copyright © {new Date().getFullYear()}
              {brand?.name ? (
                <>
                  {" by "}
                  <span className="fw-medium">{brand.name}</span>
                </>
              ) : null}{" "}
              All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
