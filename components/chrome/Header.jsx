"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CartTrigger from "@/components/cart/CartTrigger";
import { menuLinkHref } from "@/lib/routes";

/**
 * Site header: logo, desktop nav, the menu's CTA button, and the mobile menu.
 *
 * Content is API-driven: the logo comes from /config brand, the links from the
 * menu mounted in the header region. A menu item whose `badge` is "cta" renders
 * as the button (BCH: the rose START HERE pill) rather than a nav link, so it is
 * admin-managed like the rest.
 *
 * The bag icon renders only when `showCart` is true. The client brief is
 * explicit that account and bag icons appear only when those functions work,
 * so an install without live retail checkout shows neither.
 *
 * The mobile menu lives here rather than in its own offcanvas so one piece of
 * state drives the toggle, the panel and the scroll lock. It lists the same
 * items in the same order, so Telehealth Care and Shop open first.
 */
export default function Header({ brand, menu, showCart = false }) {
  const items = menu?.items ?? [];
  const cta = items.find((item) => item.badge === "cta");
  const navItems = items.filter((item) => item.badge !== "cta");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  const isCurrent = (href) => href !== "#" && href.split("?")[0] === pathname;

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes; the page behind does not scroll while the panel is open.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const logo = brand?.logo_url ? (
    // Backend-hosted SVG: plain <img>.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logo_url} alt={brand?.name || "Home"} width={72} height={72} />
  ) : (
    <strong>{brand?.name || ""}</strong>
  );

  return (
    <header className="bch-header">
      <div className="bch-container bch-header__inner">
        <button
          ref={toggleRef}
          type="button"
          className="bch-header__toggle"
          aria-expanded={open}
          aria-controls="bch-mobile-menu"
          onClick={() => setOpen(true)}
        >
          <span className="bch-visually-hidden">Open menu</span>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        <Link href="/" className="bch-header__logo">
          {logo}
        </Link>

        <nav className="bch-header__nav" aria-label="Main">
          <ul>
            {navItems.map((item) => {
              const href = menuLinkHref(item.link);

              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    target={item.target || undefined}
                    aria-current={isCurrent(href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="bch-header__actions">
          {cta ? (
            <Link href={menuLinkHref(cta.link)} className="bch-btn bch-btn--primary">
              {cta.label}
            </Link>
          ) : null}
          {showCart ? <CartTrigger /> : null}
        </div>
      </div>

      <div
        id="bch-mobile-menu"
        className="bch-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
      >
        <div className="bch-mobile-menu__top">
          <Link href="/">{logo}</Link>
          <button
            type="button"
            className="bch-header__toggle"
            onClick={() => {
              setOpen(false);
              toggleRef.current?.focus();
            }}
          >
            <span className="bch-visually-hidden">Close menu</span>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <ul className="bch-mobile-menu__list">
          {navItems.map((item) => (
            <li key={item.id}>
              <Link href={menuLinkHref(item.link)} target={item.target || undefined}>
                {item.label}
                <span className="bch-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {cta ? (
          <div className="bch-mobile-menu__cta">
            <Link href={menuLinkHref(cta.link)} className="bch-btn bch-btn--primary">
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
