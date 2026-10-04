"use client";
import Link from "next/link";
import { useEffect } from "react";
import Nav from "./Nav";
import CartTrigger from "@/components/cart/CartTrigger";
import { menuLinkHref } from "@/lib/routes";

/**
 * Site header (port of theme Header1): mobile menu trigger, logo, desktop
 * nav, CTA button. Content is API-driven — logo/name from /config brand,
 * links from the header region's menu. Menu items whose `badge` is "cta"
 * render as the header button instead of a nav link, so the CTA is
 * admin-managed like everything else.
 *
 * Also owns the theme's hide-on-scroll-down / reveal-on-scroll-up behavior
 * (ported from the reference layout.js).
 */
export default function Header({ brand, menu }) {
  const items = menu?.items ?? [];
  const cta = items.find((item) => item.badge === "cta");
  const navItems = items.filter((item) => item.badge !== "cta");

  useEffect(() => {
    let lastScrollTop = 0;
    const delta = 5;
    let didScroll = false;
    const header = document.querySelector("header#header");

    const handleScroll = () => {
      didScroll = true;
    };

    const checkScroll = () => {
      if (!didScroll || !header) {
        return;
      }

      const st = window.scrollY || document.documentElement.scrollTop;
      const navbarHeight = header.offsetHeight;

      if (st > navbarHeight) {
        if (st > lastScrollTop + delta) {
          header.style.top = `-${navbarHeight}px`;
        } else if (st < lastScrollTop - delta) {
          header.style.top = "0";
          header.classList.add("header-bg");
        }
      } else {
        header.style.top = "";
        header.classList.remove("header-bg");
      }

      lastScrollTop = st;
      didScroll = false;
    };

    window.addEventListener("scroll", handleScroll);
    const scrollInterval = setInterval(checkScroll, 250);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(scrollInterval);
    };
  }, []);

  return (
    <header id="header" className="header-default">
      <div className="container">
        <div className="row wrapper-header align-items-center">
          <div className="col-md-4 col-3 d-xl-none">
            <a
              href="#mobileMenu"
              className="mobile-menu"
              data-bs-toggle="offcanvas"
              aria-controls="mobileMenu"
            >
              <i className="icon icon-categories1" />
            </a>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <Link href="/" className="logo-header">
              {brand?.logo_url ? (
                // Backend-hosted image: plain <img>, browser loads cross-origin freely.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={brand?.name || "logo"} className="logo" src={brand.logo_url} height={44} />
              ) : (
                <strong className="logo">{brand?.name || ""}</strong>
              )}
            </Link>
          </div>
          <div className="col-xl-8 d-none d-xl-block">
            <nav className="box-navigation text-center">
              <ul className="box-nav-menu">
                <Nav items={navItems} />
              </ul>
            </nav>
          </div>
          <div className="col-xl-2 col-md-4 col-3">
            <ul className="nav-icon d-flex justify-content-end align-items-center">
              {cta ? (
                <li>
                  {/* d-sm-flex, not d-sm-block: the display utility carries
                      !important, and `block` kills .atlas-header-cta's flex
                      centering, dropping the label to the top of the pill. */}
                  <Link
                    href={menuLinkHref(cta.link)}
                    className="atlas-header-cta btn text-capitalize d-none d-sm-flex"
                  >
                    {cta.label}
                  </Link>
                </li>
              ) : null}
              {/* Account icon returns with the patient-portal milestone. */}
              <li>
                <CartTrigger />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
